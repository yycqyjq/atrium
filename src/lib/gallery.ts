import { resolveGalleryConfig, galleryDir } from "@/lib/config";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import type { ContentReason } from "@/lib/content";

export type { ContentReason };

export type GalleryImage = { name: string; path: string; url: string; fallbackUrls: string[] };
export type GalleryAlbum = { name: string; path: string };

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const IMAGE_CAP = 240;
const ALBUM_CAP = 60;
const ALBUM_FETCH_CAP = 24;
const SECTIONS_TTL = 2 * 60_000;

let sectionsCache: {
  at: number;
  value: { sections: GallerySection[]; dir: string; reason: ContentReason };
} | null = null;

/** 写操作（上传 / 改名 / 移除）后调用，让画廊即刻反映最新内容 */
export function bustGalleryCache() {
  sectionsCache = null;
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
  if (sectionsCache && Date.now() - sectionsCache.at < SECTIONS_TTL) {
    return sectionsCache.value;
  }

  try {
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
      return { name: entry.name, path: entry.path, url: candidates[0], fallbackUrls: candidates.slice(1) };
    };

    const albumDirs = rootEntries
      .filter((e) => e.type === "dir" && !e.name.startsWith("."))
      .slice(0, ALBUM_FETCH_CAP);

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
            return { key: dirEntry.path, name: dirEntry.name, slug: dirEntry.name, images: [] as GalleryImage[] };
          }
        }),
      )
    ).filter((s) => s.images.length > 0);

    const rootImages = rootEntries
      .filter((e) => e.type === "file" && IMAGE_RE.test(e.name))
      .slice(0, IMAGE_CAP)
      .map(toImage);
    if (rootImages.length > 0) {
      sections.push({ key: "__root__", name: "散张", slug: "root", images: rootImages });
    }

    const value = { sections, dir: rootDir, reason: "ok" as ContentReason };
    sectionsCache = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.warn("[gallery] 获取失败：", err);
    if (sectionsCache) {
      // 抖动 / 临时限流：沿用上次成功的数据
      return sectionsCache.value;
    }
    return { sections: [], dir: rootDir, reason: "fetch-failed" };
  }
}
