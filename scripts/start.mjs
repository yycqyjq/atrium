/**
 * 启动脚本：准备 standalone 产物并启动本地服务。
 * - 把 .next/static（与可选的 public/）同步进 .next/standalone
 * - 把 NODE_EXTRA_CA_CERTS 的相对路径转为绝对路径
 *   （standalone server 启动时会 chdir 到自身目录，相对路径会在首次 TLS 时解析失败）
 * - 钉住 ATRIUM_DATA_DIR 到项目根 data/，避免数据目录随 chdir 漂移
 * 用法：pnpm build 之后执行 pnpm start
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.error("[start] 找不到 .next/standalone，请先执行 pnpm build");
  process.exit(1);
}

// 1) 同步静态资源
const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneDir, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}

const publicSrc = join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standaloneDir, "public"), { recursive: true });
}

// 2) 组织子进程环境
const env = { ...process.env };

if (env.NODE_EXTRA_CA_CERTS && !isAbsolute(env.NODE_EXTRA_CA_CERTS)) {
  env.NODE_EXTRA_CA_CERTS = resolve(root, env.NODE_EXTRA_CA_CERTS);
}
env.ATRIUM_DATA_DIR = env.ATRIUM_DATA_DIR || join(root, "data");
env.ATRIUM_ALLOW_WRITE = env.ATRIUM_ALLOW_WRITE || "1"; // 本地服务允许写作/上传

// 3) 启动服务（cwd 保持项目根，配置与数据路径稳定）
const serverEntry = join(standaloneDir, "server.js");
const child = spawn(process.execPath, [serverEntry], {
  cwd: root,
  stdio: "inherit",
  env,
});

// 信号转发：父进程收到终止信号时，一并结束子进程（避免端口残留）
for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(sig, () => {
    if (child.exitCode === null) child.kill(sig);
  });
}

child.on("exit", (code) => process.exit(code ?? 0));
