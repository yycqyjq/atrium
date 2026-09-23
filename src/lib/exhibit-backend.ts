/**
 * 展品后端运行时：通用加载器与分发（方案：展品声明式后端模块）。
 *
 * 契约：展品仓库可在 src/exhibits/<id>/backend.ts 提供服务端逻辑，构建产物为
 * dist/exhibits/<id>.backend.js（Node ESM），导出：
 *
 *   export const backend = {
 *     handle(req: { method, path, query, body }): Promise<{ status?, json?, bytes?, contentType? }>,
 *     onStart?(), onStop?()
 *   };
 *
 * 中庭通过同源路由 /api/exhibit/<id>/* 把请求分发给对应模块（app/api/exhibit/[id]/[...path]）。
 * 中庭不认识任何具体展品——这里只有加载、缓存与护栏，没有业务逻辑。
 *
 * 加载来源（按序）：
 * 1. ATRIUM_EXHIBIT_BACKENDS=<目录>：本机开发直连 bricks 的 dist/exhibits/（改动即生效需重启或清缓存）；
 * 2. 组件项目仓库：经 provider getFile 拉取（带鉴权，私有仓库可用），缓存到 data/exhibit-backends/。
 *
 * 信任模型：展品后端代码与展品前端代码同源同信任（接入仓库即信任其代码在本机执行）。
 * 全局开关：ATRIUM_EXHIBIT_BACKEND=0 时加载器恒返回空（纯前端模式）。
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readStoredConfig, resolveDemoProjects } from "./config";
import { githubProvider } from "./providers/github";

export interface ExhibitBackendRequest {
  method: string;
  /** 展品内相对路径（不含 /api/exhibit/<id> 前缀） */
  path: string;
  query: Record<string, string>;
  body: unknown;
}

export interface ExhibitBackendResponse {
  status?: number;
  json?: unknown;
  bytes?: Uint8Array;
  contentType?: string;
}

export interface ExhibitBackendModule {
  handle(req: ExhibitBackendRequest): Promise<ExhibitBackendResponse>;
  onStart?(): void | Promise<void>;
  onStop?(): void | Promise<void>;
}

const g = globalThis as { __atriumExhibitBackends?: Map<string, ExhibitBackendModule> };
const registry = (g.__atriumExhibitBackends ??= new Map<string, ExhibitBackendModule>());

/** 逃逸打包器：对运行时才确定的文件路径做原生动态 import（Turbopack 会把普通动态 import 静态化） */
const dynamicImport = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;

export function backendsEnabled(): boolean {
  return process.env.ATRIUM_EXHIBIT_BACKEND !== "0";
}

function cacheRoot(): string {
  const dataDir = process.env.ATRIUM_DATA_DIR || join(process.cwd(), "data");
  return join(dataDir, "exhibit-backends");
}

async function loadFromLocalDir(id: string): Promise<ExhibitBackendModule | null> {
  const dir = process.env.ATRIUM_EXHIBIT_BACKENDS;
  if (!dir) return null;
  const file = join(dir, `${id}.backend.js`);
  if (!existsSync(file)) return null;
  const mod = (await dynamicImport(pathToFileURL(file).href)) as { backend?: ExhibitBackendModule };
  return mod.backend ?? null;
}

async function loadFromRepos(id: string): Promise<ExhibitBackendModule | null> {
  let projects;
  try {
    projects = await resolveDemoProjects();
  } catch {
    return null;
  }
  const repoProjects = projects.filter((p) => p.kind === "repo" && p.repo);
  for (const p of repoProjects) {
    const [owner, repo] = (p.repo ?? "").split("/");
    if (!owner || !repo) continue;
    try {
      const stored = await readStoredConfig();
      const token = stored.repos?.github?.token ?? "";
      const provider = await githubProvider({ owner, repo, branch: p.branch || "main", token });
      const filePath = `dist/exhibits/${id}.backend.js`;
      const file = await provider.getFile(filePath);
      const code = Buffer.from(
        file.content ?? "",
        file.encoding === "base64" ? "base64" : "utf8",
      ).toString("utf8");
      const cacheDir = join(cacheRoot(), owner, repo, p.branch || "main");
      mkdirSync(cacheDir, { recursive: true });
      const cached = join(cacheDir, `${id}.backend.js`);
      writeFileSync(cached, code, "utf8");
      const mod = (await dynamicImport(pathToFileURL(cached).href)) as {
        backend?: ExhibitBackendModule;
      };
      if (mod.backend) return mod.backend;
    } catch {
      // 该项目没有这件展品或拉取失败：继续下一个项目
    }
  }
  return null;
}

/** 加载展品后端模块（进程内缓存；未找到返回 null） */
export async function loadBackend(id: string): Promise<ExhibitBackendModule | null> {
  if (!backendsEnabled()) return null;
  const cached = registry.get(id);
  if (cached) return cached;
  const mod = (await loadFromLocalDir(id)) ?? (await loadFromRepos(id));
  if (!mod || typeof mod.handle !== "function") return null;
  registry.set(id, mod);
  await mod.onStart?.();
  return mod;
}

/** 展品后端模块是否已注册 */
export function hasBackend(id: string): boolean {
  return registry.has(id);
}

/**
 * 分发器统一超时：长任务类接口自行在展品内限速，这里防挂死——
 * handle 无响应时也要让 HTTP 请求返回（由 app/api/exhibit/[id] 的分发路由消费）。
 */
export const HANDLE_TIMEOUT_MS = 120_000;
