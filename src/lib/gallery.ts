import { resolveGalleryConfig } from "@/lib/config";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import type { ContentReason } from "@/lib/content";

export type { ContentReason };

export type GalleryImage = { name: string; path: string; url: string };
export type GalleryAlbum = { name: string; path: string };

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const IMAGE_CAP = 240;
const ALBUM_CAP = 60;

/**
 * 画廊：列出「相册（子目录）」与「图片」。
 * 默认从仓库的 images/ 目录读取，可用 ATRIUM_GALLERY_DIR 调整；
 * 仓库可用 GITHUB_GALLERY_* / GITEE_GALLERY_* 单独指定（默认跟随主仓库）。
 */
export async function listGallery(album?: string): Promise<{
  albums: GalleryAlbum[];
  images: GalleryImage[];
  current: string | null;
  dir: string;
  reason: ContentReason;
}> {
  const rootDir = (process.env.ATRIUM_GALLERY_DIR ?? "images").replace(/^\/+|\/+$/g, "");

  try {
    const cfg = await resolveGalleryConfig();
    const provider = await getProvider(cfg.provider, cfg);
    if (!(await provider.isConfigured())) {
      return { albums: [], images: [], current: null, dir: rootDir, reason: "not-configured" };
    }

    const target = album ? `${rootDir}/${album}` : rootDir;

    let entries;
    try {
      entries = await provider.listDir(target);
    } catch (err) {
      // 目录不存在 → 视为「空画廊 / 相册不存在」
      if (err instanceof ProviderError && err.status === 404) {
        return { albums: [], images: [], current: album ?? null, dir: rootDir, reason: "ok" };
      }
      throw err;
    }

    // 进入相册后，顶部的相册导航仍取自根目录
    let rootEntries = entries;
    if (album) {
      rootEntries = await provider.listDir(rootDir).catch(() => []);
    }

    const albums = rootEntries
      .filter((e) => e.type === "dir" && !e.name.startsWith("."))
      .slice(0, ALBUM_CAP)
      .map((e) => ({ name: e.name, path: e.path }));

    const images = entries
      .filter((e) => e.type === "file" && IMAGE_RE.test(e.name))
      .slice(0, IMAGE_CAP)
      .map((e) => ({ name: e.name, path: e.path, url: provider.rawUrl(e.path) }));

    return { albums, images, current: album ?? null, dir: rootDir, reason: "ok" };
  } catch (err) {
    console.warn("[gallery] 获取失败：", err);
    return { albums: [], images: [], current: album ?? null, dir: rootDir, reason: "fetch-failed" };
  }
}
