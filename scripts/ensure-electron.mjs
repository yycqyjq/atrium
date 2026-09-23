/**
 * 确保 Electron 二进制就位。
 * 各版本 pnpm 对「依赖构建脚本」的放行策略不一致（白名单可能不生效），
 * 这里不依赖它：安装后检查 electron/dist，缺失时直接调用 electron 自带的安装脚本补下。
 * 主源（GitHub Releases）失败时自动换 npmmirror 镜像重试一次。
 * 设置 ELECTRON_SKIP_BINARY_DOWNLOAD=1 时跳过（纯网页检查的 CI 用得上）。
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
  process.exit(0);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const electronDir = join(root, "node_modules", "electron");
const distDir = join(electronDir, "dist");
if (
  existsSync(distDir) &&
  existsSync(join(distDir, "Electron.app")) &&
  existsSync(join(distDir, "version"))
) {
  process.exit(0);
}
const installer = join(electronDir, "install.js");
if (!existsSync(installer)) {
  console.log("[ensure-electron] 未找到 electron 包，跳过");
  process.exit(0);
}
console.log("[ensure-electron] Electron 二进制缺失，开始补装…");
const run = (envExtra) => {
  const result = spawnSync(process.execPath, [installer], {
    stdio: "inherit",
    cwd: electronDir,
    env: { ...process.env, ...envExtra },
  });
  return result.status ?? 1;
};
let status = run({});
if (status !== 0) {
  console.log("[ensure-electron] 主源失败，换 npmmirror 镜像重试…");
  status = run({ ELECTRON_MIRROR: "https://npmmirror.com/mirrors/electron/" });
}
if (status !== 0) {
  console.error("[ensure-electron] 补装失败");
  process.exit(status);
}
console.log("[ensure-electron] 完成");
