/**
 * 组装桌面打包用的服务目录 desktop-server/，并打单文件压缩包 desktop-server.tar.gz：
 *   desktop-server = .next/standalone（server.js + 运行依赖，pnpm 符号链接结构）
 *                    + .next/static + public（如存在）+ data 占位
 * 关键处理：pnpm 的 node_modules 依赖符号链接结构解析依赖，
 * 因此打包时**保留符号链接**，并把指向项目目录的「绝对链接」改写为「相对链接」，
 * 保证解压到任意位置后依然自包含可用。
 * 用法：pnpm build 之后执行 node scripts/prepare-desktop.mjs
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

// 版本号单一来源：根 package.json → 同步进桌面壳清单（electron-builder 读的是后者）
const rootVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const shellManifestPath = join(root, "electron-app", "package.json");
const shellManifest = JSON.parse(readFileSync(shellManifestPath, "utf8"));
if (shellManifest.version !== rootVersion) {
  shellManifest.version = rootVersion;
  writeFileSync(shellManifestPath, `${JSON.stringify(shellManifest, null, 2)}\n`, "utf8");
  console.log(`[prepare-desktop] 桌面壳版本已同步为 ${rootVersion}`);
}

if (!existsSync(join(standalone, "server.js"))) {
  console.error("[prepare-desktop] 找不到 .next/standalone/server.js，请先执行 pnpm build");
  process.exit(1);
}

// 产物放项目外（避免被 next dev 的文件监听扫描，曾导致 EMFILE 风暴）
const OUT_BASE = join(root, "..", "atrium-dist", "build");
const out = join(OUT_BASE, "desktop-server");
if (existsSync(out)) {
  // 旧产物归档到项目外隔离区（名字用「年月日-时分」，便于人眼识别）
  const attic = join(root, "..", "atrium-attic"); // 项目外隔离区：避免被 dev 文件监听扫到
  mkdirSync(attic, { recursive: true });
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
  let stale = join(attic, `desktop-server-${stamp}`);
  let i = 2;
  while (existsSync(stale)) stale = join(attic, `desktop-server-${stamp}-${i++}`);
  renameSync(out, stale);
  console.log(`[prepare-desktop] 旧产物已归档：atrium-attic/${basename(stale)}`);
}
mkdirSync(out, { recursive: true });

// server.js + 运行依赖
// 白名单复制：standalone 可能被 Turbopack 带入项目根的其它目录（certs/docs/release 等），
// 只复制运行必需项，既防膨胀也防证书等敏感文件被打进应用包。
const KEEP = ["server.js", "package.json", "node_modules", ".next"];
for (const name of KEEP) {
  const from = join(standalone, name);
  if (existsSync(from)) {
    // Windows 下把链接全部实体化（符号链接需权限，打包与解包都会出问题）
    cpSync(from, join(out, name), {
      recursive: true,
      dereference: process.platform === "win32",
    });
  }
}

// 静态资源
const staticSrc = join(root, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(join(out, ".next"), { recursive: true });
  cpSync(staticSrc, join(out, ".next", "static"), { recursive: true });
}

// public（如存在）
const publicSrc = join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(out, "public"), { recursive: true });
}

// data 占位（打包版运行时数据目录为系统 userData）
mkdirSync(join(out, "data"), { recursive: true });

// 将指向项目目录的绝对符号链接改写为相对链接
let rewritten = 0;
let external = 0;
function fixLinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = readlinkSync(full);
      if (!isAbsolute(target)) continue; // 相对链接：保持原样
      const resolved = resolve(dirname(full), target);
      // 目标可能指向原 standalone 树（需映射到 desktop-server 的对应位置），也可能已在 out 内
      let mapped = null;
      if (resolved.startsWith(out + sep)) mapped = resolved;
      else if (resolved.startsWith(standalone + sep))
        mapped = out + resolved.slice(standalone.length);
      if (mapped) {
        const rel = relative(dirname(full), mapped);
        unlinkSync(full);
        symlinkSync(rel, full);
        rewritten += 1;
      } else {
        external += 1;
        console.warn("[prepare-desktop] 发现指向外部的链接：", full, "->", target);
      }
    } else if (entry.isDirectory()) {
      fixLinks(full);
    }
  }
}
fixLinks(out);
console.log(`[prepare-desktop] 链接处理完成：改写 ${rewritten} 个，外部链接 ${external} 个`);

// 打单文件包（保留符号链接）
const tarPath = join(OUT_BASE, "desktop-server.tar.gz");
const result = spawnSync("tar", ["-czf", tarPath, "-C", out, "."], { stdio: "inherit" });
if (result.status !== 0) {
  console.error("[prepare-desktop] tar 打包失败");
  process.exit(1);
}

console.log("[prepare-desktop] desktop-server 与 desktop-server.tar.gz 已就绪");
