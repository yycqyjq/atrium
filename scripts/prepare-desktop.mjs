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
  lstatSync,
  mkdirSync,
  renameSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("[prepare-desktop] 找不到 .next/standalone/server.js，请先执行 pnpm build");
  process.exit(1);
}

const out = join(root, "desktop-server");
if (existsSync(out)) {
  // 旧产物改名为 .old（避免覆盖冲突：pnpm 自引用链接 cpSync 无法覆盖自身子目录）
  const stale = `${out}.old-${Date.now()}`;
  renameSync(out, stale);
  console.log(`[prepare-desktop] 旧目录已移走：${basename(stale)}`);
}
mkdirSync(out, { recursive: true });

// server.js + 运行依赖
cpSync(standalone, out, { recursive: true });

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
      else if (resolved.startsWith(standalone + sep)) mapped = out + resolved.slice(standalone.length);
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
const tarPath = join(root, "desktop-server.tar.gz");
const result = spawnSync("tar", ["-czf", tarPath, "-C", out, "."], { stdio: "inherit" });
if (result.status !== 0) {
  console.error("[prepare-desktop] tar 打包失败");
  process.exit(1);
}

console.log("[prepare-desktop] desktop-server 与 desktop-server.tar.gz 已就绪");
