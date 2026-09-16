import { resolveDemoProjects, resolveRepoConfig, type DemoProject } from "./config";

export type DemoProp = { name: string; type?: string; default?: string; note?: string };

/** 一件展品（来自某个组件仓库的清单或扫描） */
export type DemoItem = {
  projectId: string;
  projectName: string;
  id: string;
  title: string;
  desc?: string;
  group?: string;
  /** 仓库内路径（模块入口，如 dist/exhibits/toast.js） */
  path: string;
  /** 可读源码路径（缺省跟随 path） */
  source?: string;
  /** 仓库内样式路径列表 */
  styles: string[];
  usage?: string;
  props?: DemoProp[];
  defaultProps?: Record<string, unknown>;
};

export type DemosResult = {
  projects: DemoProject[];
  items: DemoItem[];
  errors: string[];
};

const MANIFEST = "atrium.json";
const LIST_TTL = 60_000;
const FILE_TTL = 60_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** 列表缓存：短时效，命中直接复用 */
let listCache: { at: number; key: string; value: DemosResult } | null = null;

async function ghToken(): Promise<string> {
  try {
    return (await resolveRepoConfig("github")).token ?? "";
  } catch {
    return "";
  }
}

function ghHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "atrium",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function ghJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, { headers: ghHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

function repoParts(project: DemoProject): { owner: string; repo: string; branch: string } | null {
  if (!project.repo || !project.repo.includes("/")) return null;
  const [owner, repo] = project.repo.split("/");
  if (!owner || !repo) return null;
  return { owner, repo, branch: project.branch || "main" };
}

function joinDir(dir: string, rel: string): string {
  const clean = rel.replace(/^\/+/, "");
  return dir ? `${dir}/${clean}` : clean;
}

function normalizeExhibit(
  project: DemoProject,
  dir: string,
  ex: Record<string, unknown>,
): DemoItem | null {
  const id = typeof ex.id === "string" ? ex.id.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) return null;
  const entry = typeof ex.entry === "string" ? ex.entry.trim() : "";
  if (!entry || entry.includes("..")) return null;

  const styles = Array.isArray(ex.styles)
    ? ex.styles
        .filter((s): s is string => typeof s === "string" && !!s && !s.includes(".."))
        .map((s) => joinDir(dir, s))
    : [];
  const source =
    typeof ex.source === "string" && ex.source && !ex.source.includes("..")
      ? joinDir(dir, ex.source)
      : undefined;

  return {
    projectId: project.id,
    projectName: project.name,
    id,
    title: typeof ex.title === "string" && ex.title.trim() ? ex.title.trim() : id,
    desc: typeof ex.desc === "string" && ex.desc.trim() ? ex.desc.trim() : undefined,
    group: typeof ex.group === "string" && ex.group.trim() ? ex.group.trim() : undefined,
    path: joinDir(dir, entry),
    source,
    styles,
    usage: typeof ex.usage === "string" && ex.usage ? ex.usage : undefined,
    props: Array.isArray(ex.props) ? (ex.props as DemoProp[]) : undefined,
    defaultProps:
      typeof ex.defaultProps === "object" && ex.defaultProps !== null
        ? (ex.defaultProps as Record<string, unknown>)
        : undefined,
  };
}

/** 读展品清单（atrium.json）；没有清单时按目录扫描 .js 降级 */
async function listRepoItems(project: DemoProject): Promise<DemoItem[]> {
  const parts = repoParts(project);
  if (!parts) throw new Error("仓库格式应为 owner/名字");
  const token = await ghToken();
  const { owner, repo, branch } = parts;
  const dir = project.dir ?? "";
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  // 1) 清单优先
  try {
    const manifestPath = joinDir(dir, MANIFEST);
    const data = (await ghJson(
      `${base}/contents/${manifestPath}?ref=${encodeURIComponent(branch)}`,
      token,
    )) as { content?: string; encoding?: string };
    if (data.content) {
      const json = JSON.parse(Buffer.from(data.content, "base64").toString("utf8")) as {
        exhibits?: Array<Record<string, unknown>>;
      };
      const items = (json.exhibits ?? [])
        .map((ex) => normalizeExhibit(project, dir, ex))
        .filter((x): x is DemoItem => x !== null);
      if (items.length > 0) return items;
    }
  } catch {
    // 读不到清单：落回扫描
  }

  // 2) 扫描目录内的 *.js（深度 ≤ 3）
  const tree = (await ghJson(
    `${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token,
  )) as { tree?: Array<{ path?: string; type?: string }> };
  const files = (tree.tree ?? [])
    .filter((e) => e.type === "blob" && typeof e.path === "string")
    .map((e) => e.path as string)
    .filter((p) => p.endsWith(".js") && !p.includes("node_modules/"))
    .filter((p) => {
      if (dir && p !== dir && !p.startsWith(`${dir}/`)) return false;
      const rel = dir ? p.slice(dir.length + 1) : p;
      return rel.split("/").length <= 3;
    });

  const used = new Set<string>();
  return files.map((path) => {
    const file = path.split("/").pop() ?? path;
    let id = file.replace(/\.js$/i, "");
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) id = `exhibit-${used.size + 1}`;
    let unique = id;
    for (let n = 2; used.has(unique); n += 1) unique = `${id}-${n}`;
    used.add(unique);
    return {
      projectId: project.id,
      projectName: project.name,
      id: unique,
      title: unique,
      path,
      styles: [],
    };
  });
}

export async function listDemos(opts: { fresh?: boolean } = {}): Promise<DemosResult> {
  const projects = await resolveDemoProjects();
  const key = JSON.stringify(projects);
  if (!opts.fresh && listCache && listCache.key === key && Date.now() - listCache.at < LIST_TTL) {
    return listCache.value;
  }
  const items: DemoItem[] = [];
  const errors: string[] = [];
  for (const project of projects) {
    if (project.kind !== "repo") continue;
    try {
      items.push(...(await listRepoItems(project)));
    } catch (err) {
      errors.push(`「${project.name}」读取失败：${(err as Error).message}`);
    }
  }
  const value: DemosResult = { projects, items, errors };
  listCache = { at: Date.now(), key, value };
  return value;
}

/* ================= 文件取件（代理转发与源码视图共用） ================= */

const fileCache = new Map<string, { at: number; buf: Uint8Array; type: string }>();

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff2: "font/woff2",
  woff: "font/woff",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  map: "application/json; charset=utf-8",
};

export function contentTypeOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/** 路径安全：相对路径、无 ..、无隐藏段、无反斜杠 */
export function isSafeRelPath(rel: string): boolean {
  if (!rel || rel.length > 400) return false;
  if (rel.startsWith("/") || rel.includes("\\")) return false;
  return rel.split("/").every((seg) => seg && seg !== "." && seg !== ".." && !seg.startsWith("."));
}

/** 经 GitHub API 读文件：不受 CDN 边缘缓存影响（刷新时优先用，立即拿到最新提交） */
async function fetchViaApi(
  owner: string,
  repo: string,
  branch: string,
  rel: string,
  token: string,
): Promise<Uint8Array | null> {
  if (!token) return null;
  try {
    const encoded = rel.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders(token), cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string; encoding?: string; size?: number };
    if (!data.content || data.encoding !== "base64") return null;
    if ((data.size ?? 0) > MAX_FILE_BYTES) return null;
    return new Uint8Array(Buffer.from(data.content, "base64"));
  } catch {
    return null;
  }
}

export async function fetchDemoFile(
  project: DemoProject,
  rel: string,
  fresh = false,
): Promise<{ buf: Uint8Array; type: string } | null> {
  const parts = repoParts(project);
  if (!parts || !isSafeRelPath(rel)) return null;
  const { owner, repo, branch } = parts;
  const key = `${owner}/${repo}@${branch}:${rel}`;

  const token = await ghToken();

  const hit = fileCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < FILE_TTL) return { buf: hit.buf, type: hit.type };

  // 刷新请求：优先走 API 直读（绕过 CDN 滞后），失败再落回常规通道
  if (fresh) {
    const viaApi = await fetchViaApi(owner, repo, branch, rel, token);
    if (viaApi) {
      const type = contentTypeOf(rel);
      fileCache.set(key, { at: Date.now(), buf: viaApi, type });
      return { buf: viaApi, type };
    }
  }

  const encoded = rel.split("/").map(encodeURIComponent).join("/");
  const candidates: Array<{ url: string; auth: boolean }> = [
    {
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encoded}`,
      auth: true,
    },
    {
      url: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${encodeURIComponent(branch)}/${encoded}`,
      auth: false,
    },
  ];

  for (const candidate of candidates) {
    try {
      const headers: Record<string, string> = { "User-Agent": "atrium" };
      if (candidate.auth && token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(candidate.url, { headers, cache: "no-store" });
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      if (ab.byteLength > MAX_FILE_BYTES) return null;
      const buf = new Uint8Array(ab);
      if (fileCache.size > 240) fileCache.clear();
      const type = contentTypeOf(rel);
      fileCache.set(key, { at: Date.now(), buf, type });
      return { buf, type };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchDemoText(
  project: DemoProject,
  rel: string,
  fresh = false,
): Promise<string | null> {
  const file = await fetchDemoFile(project, rel, fresh);
  if (!file) return null;
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(file.buf);
  } catch {
    return null;
  }
}
