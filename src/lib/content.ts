import { getProvider } from "@/lib/providers";
import type { RepoEntry } from "@/lib/providers/types";

export type PostMeta = {
  title: string;
  name: string;
  path: string;
  category: string;
  lastModified: number | null;
  dateLabel: string;
  description?: string;
};

export type ContentReason = "ok" | "not-configured" | "fetch-failed";

const MD_RE = /\.mdx?$/i;
/** 为最近 N 个文件取提交时间（每个文件一次请求；带 Token 时额度充足） */
const DATE_SCAN_LIMIT = 30;
const CACHE_TTL = 60_000;

class NotConfiguredError extends Error {}

function toLabel(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

async function collectPosts(providerKey?: string): Promise<PostMeta[]> {
  const provider = await getProvider(providerKey);
  if (!(await provider.isConfigured())) throw new NotConfiguredError();

  const root = await provider.listDir("");
  const files: RepoEntry[] = [];
  for (const entry of root) {
    if (entry.type === "file" && MD_RE.test(entry.name)) {
      files.push(entry);
    } else if (entry.type === "dir") {
      // 一级子目录视作分类
      try {
        const sub = await provider.listDir(entry.path);
        for (const item of sub) {
          if (item.type === "file" && MD_RE.test(item.name)) files.push(item);
        }
      } catch {
        /* 子目录读取失败忽略，不影响其余内容 */
      }
    }
  }

  const dated = await Promise.all(
    files.slice(0, DATE_SCAN_LIMIT).map(async (file) => ({
      file,
      ts: await provider.lastCommitDate(file.path).catch(() => null),
    })),
  );
  const rest = files.slice(DATE_SCAN_LIMIT).map((file) => ({
    file,
    ts: null as number | null,
  }));

  const sorted = [...dated, ...rest].sort(
    (a, b) => (b.ts ?? 0) - (a.ts ?? 0) || a.file.path.localeCompare(b.file.path),
  );

  return sorted.map(({ file, ts }) => ({
    title: file.name.replace(MD_RE, ""),
    name: file.name,
    path: file.path,
    category: file.path.includes("/") ? file.path.split("/")[0] : "",
    lastModified: ts,
    dateLabel: toLabel(ts),
  }));
}

let cache: { at: number; key: string; items: PostMeta[] } | null = null;

/** 全量文章列表（带 60s 内存缓存），再按 limit 截取 */
export async function listPosts({
  limit = 20,
  provider,
}: { limit?: number; provider?: string } = {}): Promise<{
  items: PostMeta[];
  reason: ContentReason;
}> {
  try {
    const cacheKey = provider ?? "default";
    if (!cache || cache.key !== cacheKey || Date.now() - cache.at > CACHE_TTL) {
      cache = { at: Date.now(), key: cacheKey, items: await collectPosts(provider) };
    }
    return { items: cache.items.slice(0, limit), reason: "ok" };
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return { items: [], reason: "not-configured" };
    }
    console.warn("[content] 文章列表获取失败：", err);
    return { items: [], reason: "fetch-failed" };
  }
}

export async function getRecentPosts(limit = 4) {
  return listPosts({ limit });
}
