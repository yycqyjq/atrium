import { createHash } from "node:crypto";
import { getProvider } from "@/lib/providers";
import { cacheThrough, invalidateCache, invalidateCachePrefix } from "@/lib/cache";
import { ProviderError, type RepoEntry, type RepoProvider } from "@/lib/providers/types";

export type PostMeta = {
  /** 标题：front-matter.title 优先，缺省用美化后的文件名 */
  title: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 仓库相对路径（含 .md） */
  path: string;
  /** URL 片段：路径去掉扩展名（含分类目录） */
  slug: string;
  /** 分类：一级目录名，根目录为空串 */
  category: string;
  /** 最后修改时间（毫秒），无则为 null */
  lastModified: number | null;
  /** 展示用短日期，如 "9月2日" */
  dateLabel: string;
  /** 摘要：front-matter.description 优先，缺省取正文首段 */
  description?: string;
  tags: string[];
};

export type ContentReason = "ok" | "not-configured" | "fetch-failed";

const MD_RE = /\.mdx?$/i;
/** 单次扫描最多处理的 markdown 文件数 */
const FILE_CAP = 400;
/** 递归遍历的最大目录数 */
const DIR_CAP = 120;
/** 最大下钻深度 */
const MAX_DEPTH = 6;
/** 无 front-matter 日期时回退查询提交时间的文件数上限（SWR 摊薄了回源代价，可放宽） */
const DATE_FALLBACK_CAP = 50;

class NotConfiguredError extends Error {}

/**
 * 轻量 front-matter 解析（YAML 子集）：
 * 支持 `key: value`、引号字符串、`[a, b, c]` 数组与布尔值。
 */
export function parseFrontMatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  if (!raw.startsWith("---")) return { data: {}, content: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw };

  const header = raw.slice(3, end);
  const content = raw.slice(end + 4).replace(/^\r?\n/, "");
  const data: Record<string, unknown> = {};

  for (const line of header.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value: unknown = match[2].trim();
    if (typeof value === "string") {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else if (value === "true" || value === "false") {
        value = value === "true";
      }
    }
    data[key] = value;
  }
  return { data, content };
}

/** 文件名美化：中文原样；英文把 - _ 转空格并首词大写 */
function prettifyName(name: string): string {
  const base = name.replace(MD_RE, "");
  if (/[\u4e00-\u9fff]/.test(base)) return base;
  const words = base.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return base;
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase()))
    .join(" ");
}

function parseDateValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && value.trim()) {
    const direct = Date.parse(value);
    if (!Number.isNaN(direct)) return direct;
    const m = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  }
  return null;
}

function toLabel(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 从正文提取一句摘要（跳过标题、引用、代码、纯链接行） */
function excerptFrom(body: string): string | undefined {
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    const text = line.trim();
    if (text.startsWith("```") || text.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!text) continue;
    if (/^(#|>|!|\||<|\/\/|[-*+]\s|\d+\.\s)/.test(text)) continue;
    const clean = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length >= 8) {
      return clean.length > 110 ? `${clean.slice(0, 110)}…` : clean;
    }
  }
  return undefined;
}

function metaFromData(filePath: string, data: Record<string, unknown>, body: string): PostMeta {
  const name = filePath.split("/").pop() ?? filePath;
  const titleRaw = data.title;
  const descRaw = data.description ?? data.summary ?? data.excerpt;
  const dateRaw = data.date ?? data.lastModified ?? data.updated;
  const ts = parseDateValue(dateRaw);
  return {
    title:
      typeof titleRaw === "string" && titleRaw.trim()
        ? titleRaw.trim()
        : prettifyName(name),
    name,
    path: filePath,
    slug: filePath.replace(MD_RE, ""),
    category: filePath.includes("/") ? filePath.split("/")[0] : "",
    lastModified: ts,
    dateLabel: toLabel(ts),
    description:
      typeof descRaw === "string" && descRaw.trim() ? descRaw.trim() : excerptFrom(body),
    tags: Array.isArray(data.tags)
      ? (data.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [],
  };
}

export type StudyFolder = {
  name: string;
  path: string;
  depth: number;
  /** 直属文章数 */
  files: number;
  /** 含子目录的递归文章数 */
  total: number;
};

/**
 * 递归遍历仓库：收集全部 .md 文件与文件夹索引（支持多层下钻）。
 * 跳过隐藏目录与根级 admin（配置目录）；受深度、目录数与文件数上限保护。
 */
async function walkRepo(
  provider: RepoProvider,
): Promise<{ files: RepoEntry[]; folders: StudyFolder[] }> {
  const files: RepoEntry[] = [];
  const dirRecords = new Map<string, { name: string; depth: number; direct: number }>();
  const queue: Array<{ path: string; depth: number }> = [{ path: "", depth: 0 }];
  let visited = 0;

  while (queue.length > 0 && visited < DIR_CAP && files.length < FILE_CAP) {
    const { path, depth } = queue.shift()!;
    visited += 1;
    let entries: RepoEntry[];
    try {
      entries = await provider.listDir(path);
    } catch (err) {
      if (path === "") throw err; // 根目录读取失败 = 整体失败（交给上层回退/报错）
      continue; // 子目录读取失败忽略
    }
    let direct = 0;
    for (const entry of entries) {
      if (entry.type === "file" && MD_RE.test(entry.name) && !entry.name.startsWith(".")) {
        files.push(entry);
        direct += 1;
      } else if (
        entry.type === "dir" &&
        !entry.name.startsWith(".") &&
        !(path === "" && entry.name === "admin") &&
        depth + 1 <= MAX_DEPTH
      ) {
        queue.push({ path: entry.path, depth: depth + 1 });
      }
      if (files.length >= FILE_CAP) break;
    }
    if (path) dirRecords.set(path, { name: path.split("/").pop() ?? path, depth, direct });
  }

  // 递归计数：含子目录的文章总数
  const folders: StudyFolder[] = [];
  for (const [p, rec] of dirRecords) {
    let total = rec.direct;
    for (const [q, qrec] of dirRecords) {
      if (q !== p && q.startsWith(`${p}/`)) total += qrec.direct;
    }
    folders.push({ name: rec.name, path: p, depth: rec.depth, files: rec.direct, total });
  }
  folders.sort((a, b) => a.path.localeCompare(b.path));
  return { files, folders };
}

const parentDir = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

/**
 * 单文件正文缓存（contentfile- 前缀，独立于 content- 索引命名空间）：
 * 打开文章、索引重建都先读缓存；写操作按精确路径失效（bustPostFileCache），
 * 所以前缀不被 bustContentCache 扫到——改一篇只回源一篇。
 */
const fileCacheKey = (filePath: string) =>
  `contentfile-${createHash("sha1").update(filePath).digest("hex").slice(0, 16)}`;

export function bustPostFileCache(filePath: string) {
  return invalidateCache(fileCacheKey(filePath));
}

/** 读仓库文本文件（带缓存）；404 等错误原样抛出，由调用方决定降级 */
async function getFileText(provider: RepoProvider, filePath: string): Promise<string> {
  const { value } = await cacheThrough(fileCacheKey(filePath), CONTENT_TTL, async () => {
    const raw = await provider.getFile(filePath);
    return Buffer.from(raw.content, "base64").toString("utf8");
  });
  return value;
}

async function loadOne(
  provider: RepoProvider,
  filePath: string,
): Promise<{ fm: Record<string, unknown>; body: string }> {
  try {
    const { data, content } = parseFrontMatter(await getFileText(provider, filePath));
    return { fm: data, body: content };
  } catch {
    return { fm: {}, body: "" };
  }
}

async function collectRepo(
  providerKey?: string,
): Promise<{ posts: PostMeta[]; folders: StudyFolder[] }> {
  const provider = await getProvider(providerKey);
  if (!(await provider.isConfigured())) throw new NotConfiguredError();

  const { files, folders } = await walkRepo(provider);
  const loaded = await Promise.all(
    files.map(async (file) => ({
      file,
      ...(await loadOne(provider, file.path)),
    })),
  );

  let fallbackBudget = DATE_FALLBACK_CAP;
  const metas = await Promise.all(
    loaded.map(async ({ file, fm, body }) => {
      const meta = metaFromData(file.path, fm, body);
      if (meta.lastModified === null && fallbackBudget > 0) {
        fallbackBudget -= 1;
        const ts = await provider.lastCommitDate(file.path).catch(() => null);
        meta.lastModified = ts;
        meta.dateLabel = toLabel(ts);
      }
      return meta;
    }),
  );

  return {
    posts: metas.sort(
      (a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0) || a.path.localeCompare(b.path),
    ),
    folders,
  };
}

const CONTENT_TTL = 30 * 60_000;

/**
 * 写操作（发布 / 编辑 / 删除文章）后调用，让书房即刻反映最新内容。
 * - 失效水位记在进程级共享状态里，所有 server chunk（页面 / 路由）立刻可见；
 * - 返回 Promise：await 可确保磁盘缓存也清干净后再回响应，避免紧跟的请求读到旧文件。
 */
export async function bustContentCache() {
  await invalidateCachePrefix("content-");
  // 全局搜索索引里也含文章列表，一并失效，否则要等它自己的 30 分钟 TTL
  await invalidateCachePrefix("search-index");
}

/** 读取仓库（含文件夹索引）：两级缓存（内存 + 磁盘），失败回退旧数据 */
async function loadRepo(providerKey?: string) {
  const cacheKey = `content-${providerKey ?? "default"}`;
  const { value, stale } = await cacheThrough(cacheKey, CONTENT_TTL, () => collectRepo(providerKey), {
    hardError: (err) => err instanceof NotConfiguredError,
    suspicious: (next, prev) => next.posts.length === 0 && (prev?.posts.length ?? 0) > 0,
  });
  if (stale) console.warn("[content] 使用缓存数据（可能不是最新）");
  return value;
}

/** 全量文章列表（60s 内存缓存）；limit 省略时返回全部 */
export async function listPosts({
  limit,
  provider,
}: { limit?: number; provider?: string } = {}): Promise<{
  items: PostMeta[];
  reason: ContentReason;
}> {
  try {
    const repo = await loadRepo(provider);
    const items = typeof limit === "number" ? repo.posts.slice(0, limit) : repo.posts;
    return { items, reason: "ok" };
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return { items: [], reason: "not-configured" };
    }
    console.warn("[content] 文章列表获取失败：", err);
    return { items: [], reason: "fetch-failed" };
  }
}

/** 书房索引：全量文章 + 文件夹树（供分组视图与全量搜索） */
export async function studyIndex(): Promise<{
  posts: PostMeta[];
  folders: StudyFolder[];
  reason: ContentReason;
}> {
  try {
    const repo = await loadRepo();
    return { posts: repo.posts, folders: repo.folders, reason: "ok" };
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return { posts: [], folders: [], reason: "not-configured" };
    }
    console.warn("[content] 书房索引获取失败：", err);
    return { posts: [], folders: [], reason: "fetch-failed" };
  }
}

/**
 * 目录视图数据：某目录（或根）的直属文章与子目录。
 * slugParts 为空 = 根目录；目录不存在返回 null。
 */
export async function getStudyDir(slugParts: string[]): Promise<{
  path: string;
  folders: StudyFolder[];
  posts: PostMeta[];
  allPosts: PostMeta[];
} | null> {
  const decoded = slugParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const path = decoded.join("/");

  const repo = await loadRepo();
  const isRoot = path === "";
  const known = isRoot || repo.folders.some((f) => f.path === path);

  if (!known) {
    // 兜底探测：目录可能真实存在但不在索引（空目录 / 超出扫描上限）
    const provider = await getProvider();
    try {
      const entries = await provider.listDir(path);
      const sub = entries
        .filter((e) => e.type === "dir" && !e.name.startsWith("."))
        .map((e) => ({
          name: e.name,
          path: e.path,
          depth: decoded.length + 1,
          files: 0,
          total: 0,
        }));
      return { path, folders: sub, posts: [], allPosts: [] };
    } catch (err) {
      if (err instanceof ProviderError && err.status === 404) return null;
      throw err;
    }
  }

  const folders = repo.folders.filter((f) => parentDir(f.path) === path);
  const posts = repo.posts.filter((p) => parentDir(p.path) === path);
  return { path, folders, posts, allPosts: repo.posts };
}

export async function getRecentPosts(limit = 4) {
  return listPosts({ limit });
}

/** 读单篇：slug 数组（catch-all 路由传入），返回 meta + 正文（已剥离 front-matter） */
export async function getPostBySlug(
  slugParts: string[],
): Promise<{ meta: PostMeta; body: string } | null> {
  const decoded = slugParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const slug = decoded.join("/");

  const { items } = await listPosts();
  const found =
    items.find((p) => p.slug === slug) ??
    items.find((p) => p.slug.toLowerCase() === slug.toLowerCase());

  const provider = await getProvider();
  const tryPaths = found ? [found.path] : [slug, `${slug}.md`, `${slug}.mdx`];

  for (const filePath of tryPaths) {
    try {
      const { data, content } = parseFrontMatter(await getFileText(provider, filePath));
      const meta = found ?? metaFromData(filePath, data, content);
      if (!found) meta.dateLabel = toLabel(meta.lastModified);
      return { meta, body: content };
    } catch (err) {
      // 404 视为「该候选不存在」，继续尝试；其余（网络 / 限额 / 认证）向上抛出，由页面展示错误态
      const status = err instanceof ProviderError ? err.status : undefined;
      if (status === 404) continue;
      console.warn("[content] 读取文章失败：", filePath, err);
      throw err;
    }
  }
  return null;
}
