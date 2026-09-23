/**
 * 首页快照：聚合画廊根目录与各相册的图片，取最新 8 张。
 * 相册按名称倒序（日期命名的目录 = 时间倒序），目录内文件名倒序取最新，
 * 每个相册最多贡献 2 张，避免单一相册刷屏。灯箱 index 指向所在相册内的位置。
 */
import { resolveGalleryConfig, galleryDir } from "@/lib/config";
import { getProvider } from "@/lib/providers";
import type { GalleryImage } from "@/lib/gallery";

export type Shot = GalleryImage & { index: number; album: string | null };

export async function recentShots(limit = 8): Promise<{ shots: Shot[]; album: string | null }> {
  try {
    const cfg = await resolveGalleryConfig();
    const provider = await getProvider(cfg.provider, cfg);
    if (!(await provider.isConfigured())) return { shots: [], album: null };

    const rootDir = await galleryDir();
    const rootEntries = await provider.listDir(rootDir).catch(() => []);

    const albums = rootEntries
      .filter((e) => e.type === "dir" && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort((a, b) => b.localeCompare(a)); // 日期命名目录：名字倒序 = 新→旧

    const collected: Shot[] = [];

    // 根目录图片（倒序取前 4）
    const rootImages = rootEntries
      .filter((e) => e.type === "file" && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(e.name))
      .map((e) => ({ name: e.name, path: e.path }));
    for (const image of rootImages.slice(0, 4)) {
      const candidates = provider.rawUrlCandidates(image.path);
      collected.push({
        name: image.name,
        path: image.path,
        url: candidates[0],
        fallbackUrls: candidates.slice(1),
        index: 0,
        album: null,
      });
    }

    // 各相册：名字倒序遍历，每个相册取最新 2 张
    for (const album of albums) {
      if (collected.length >= limit) break;
      const entries = await provider
        .listDir(`${rootDir ? `${rootDir}/` : ""}${album}`)
        .catch(() => []);
      const images = entries
        .filter((e) => e.type === "file" && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(e.name))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 2);
      for (const image of images) {
        if (collected.length >= limit) break;
        const candidates = provider.rawUrlCandidates(image.path);
        const indexInAlbum = entries
          .filter((e) => e.type === "file" && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(e.name))
          .findIndex((e) => e.path === image.path);
        collected.push({
          name: image.name,
          path: image.path,
          url: candidates[0],
          fallbackUrls: candidates.slice(1),
          index: Math.max(indexInAlbum, 0),
          album,
        });
      }
    }

    // 展示顺序：根目录优先，其后相册（名字倒序）
    return { shots: collected.slice(0, limit), album: albums[0] ?? null };
  } catch {
    return { shots: [], album: null };
  }
}
