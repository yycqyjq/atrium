import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atrium.local";

/** 动态 sitemap：静态房间 + 全部文章（含子目录路径） */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/study`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/workshop`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/atelier`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const { items } = await listPosts();
    const posts: MetadataRoute.Sitemap = items.map((post) => ({
      url: `${base}/study/${post.slug
        .split("/")
        .map((p) => encodeURIComponent(p))
        .join("/")}`,
      lastModified: post.lastModified ? new Date(post.lastModified) : now,
      changeFrequency: "monthly",
      priority: 0.8,
    }));
    return [...staticRoutes, ...posts];
  } catch {
    return staticRoutes;
  }
}
