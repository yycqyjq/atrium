import { resolveGalleryConfig, galleryDir } from "@/lib/config";
import { cacheThrough, invalidateCache } from "@/lib/cache";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import type { ContentReason } from "@/lib/content";

export type { ContentReason };

export type GalleryImage = {
  name: string;
  path: string;
  url: string;
  fallbackUrls: string[];
  date?: number;
};
export type GalleryAlbum = { name: string; path: string };

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const IMAGE_CAP = 240;
const ALBUM_FETCH_CAP = 24;
const SECTIONS_TTL = 30 * 60_000;

/** 写操作（上传 / 改名 / 移除）后调用，让画廊即刻反映最新内容 */
export function bustGalleryCache() {
  void invalidateCache("gallery");
}

/**
 * 图床文件在「文章正文」里的引用地址。
 *
 * 用 jsDelivr（与 provider.rawUrl 的主源一致），**不要**换成 GitHub raw：
 * 实测本机网络下 raw.githubusercontent.com 直接超时（25s 无响应），
 * jsDelivr 的 gcore 线路 2s 内 200。既有文章用的是 raw 形式，那些图大概率一直是坏的。
 *
 * 注意 jsDelivr 对 @branch 有缓存，刚上传的文件可能有短暂延迟。
 */
export function galleryArticleUrl(
  cfg: { owner: string; repo: string; branch: string },
  filePath: string,
): string {
  const encoded = encodeURI(filePath).replace(/#/g, "%23").replace(/\?/g, "%3F");
  return `https://gcore.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${encoded}`;
}

/* 每张图的提交时间（卡片日期）：单独缓存 60 分钟，避免反复占用限额 */
const commitDateCache = new Map<string, { at: number; value: number | null }>();
const COMMIT_DATE_TTL = 60 * 60_000;

async function imageCommitDate(
  provider: { lastCommitDate: (path: string) => Promise<number | null> },
  path: string,
): Promise<number | null> {
  const hit = commitDateCache.get(path);
  if (hit && Date.now() - hit.at < COMMIT_DATE_TTL) return hit.value;
  const value = await provider.lastCommitDate(path);
  if (commitDateCache.size > 600) commitDateCache.clear();
  commitDateCache.set(path, { at: Date.now(), value });
  return value;
}

/** 小并发批处理（限制同时进行的请求数） */
async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await fn(current);
    }
  });
  await Promise.all(workers);
}

/**
 * 画廊：列出「相册（子目录）」与「图片」。
 * 默认从仓库的 images/ 目录读取，可用 ATRIUM_GALLERY_DIR 调整；
 * 仓库可用 GITHUB_GALLERY_* / GITEE_GALLERY_* 单独指定（默认跟随主仓库）。
 */
export type GallerySection = { key: string; name: string; slug: string; images: GalleryImage[] };

/**
 * 画廊分区：按「相册（子目录）」逐卷铺开，另附根目录的散张。
 * 供画廊页的分区布局 + 楼层目录使用；只保留有图的相册。
 */
export async function listGallerySections(): Promise<{
  sections: GallerySection[];
  dir: string;
  reason: ContentReason;
}> {
  const rootDir = await galleryDir();
  try {
    const { value, stale } = await cacheThrough(
      "gallery",
      SECTIONS_TTL,
      () => buildSections(rootDir),
      {
        shouldCache: (v) => v.reason === "ok",
        suspicious: (next, prev) => next.sections.length === 0 && (prev?.sections.length ?? 0) > 0,
      },
    );
    if (stale) console.warn("[gallery] 使用缓存数据（可能不是最新）");
    return value;
  } catch (err) {
    console.warn("[gallery] 获取失败：", err);
    return { sections: [], dir: rootDir, reason: "fetch-failed" };
  }
}

/** 实际抓取：成功返回数据；失败抛出（由缓存层决定是否端旧数据） */
async function buildSections(rootDir: string): Promise<{
  sections: GallerySection[];
  dir: string;
  reason: ContentReason;
}> {
  const cfg = await resolveGalleryConfig();
  const provider = await getProvider(cfg.provider, cfg);
  if (!(await provider.isConfigured())) {
    return { sections: [], dir: rootDir, reason: "not-configured" };
  }

  let rootEntries;
  try {
    rootEntries = await provider.listDir(rootDir);
  } catch (err) {
    if (err instanceof ProviderError && err.status === 404) {
      return { sections: [], dir: rootDir, reason: "ok" };
    }
    throw err;
  }

  const toImage = (entry: { name: string; path: string }): GalleryImage => {
    const candidates = provider.rawUrlCandidates(entry.path);
    return {
      name: entry.name,
      path: entry.path,
      url: candidates[0],
      fallbackUrls: candidates.slice(1),
    };
  };

  const albumDirs = rootEntries
    .filter((e) => e.type === "dir" && !e.name.startsWith("."))
    .slice(0, ALBUM_FETCH_CAP);

  let albumFailures = 0;
  const sections = (
    await Promise.all(
      albumDirs.map(async (dirEntry) => {
        try {
          const entries = await provider.listDir(dirEntry.path);
          const images = entries
            .filter((e) => e.type === "file" && IMAGE_RE.test(e.name))
            .slice(0, IMAGE_CAP)
            .map(toImage);
          return { key: dirEntry.path, name: dirEntry.name, slug: dirEntry.name, images };
        } catch {
          albumFailures += 1;
          return {
            key: dirEntry.path,
            name: dirEntry.name,
            slug: dirEntry.name,
            images: [] as GalleryImage[],
          };
        }
      }),
    )
  ).filter((s) => s.images.length > 0);

  // 全部相册都读失败：视为整体失败（交给缓存层回退）
  if (albumDirs.length > 0 && albumFailures === albumDirs.length && sections.length === 0) {
    throw new Error("相册读取全部失败");
  }

  const rootImages = rootEntries
    .filter((e) => e.type === "file" && IMAGE_RE.test(e.name))
    .slice(0, IMAGE_CAP)
    .map(toImage);
  if (rootImages.length > 0) {
    sections.push({ key: "__root__", name: "散张", slug: "root", images: rootImages });
  }

  // 补齐每张图的提交时间（失败静默，不影响出图）
  const allImages = sections.flatMap((section) => section.images);
  await mapLimit(allImages, 5, async (image) => {
    const ts = await imageCommitDate(provider, image.path);
    if (ts) image.date = ts;
  });

  return { sections, dir: rootDir, reason: "ok" as ContentReason };
}
