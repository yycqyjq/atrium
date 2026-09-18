import { NextResponse } from "next/server";
import { cacheThrough } from "@/lib/cache";
import { listPosts } from "@/lib/content";
import { listTools } from "@/lib/tools";
import { listDemos } from "@/lib/demos";
import { listGallerySections } from "@/lib/gallery";

export const dynamic = "force-dynamic";

type Index = {
  posts: { title: string; slug: string; category: string; dateLabel?: string }[];
  tools: { name: string; url: string; description: string; category: string }[];
  exhibits: {
    title: string;
    desc?: string;
    projectId: string;
    projectName: string;
    id: string;
    group?: string;
    origin?: string;
  }[];
  images: { name: string; album: string; view: number }[];
};

/** 五分钟缓存；发布文章时由 bustContentCache() 按 search-index 前缀一并清掉 */
const TTL = 5 * 60_000;

/**
 * 单路缓存 + 单路降级：某一路回源失败（抖动 / 限流）时沿用自己上次的结果，
 * 不会因为一路失败把整块索引拖空。走统一缓存层，因此写操作能真正失效它。
 */
async function cachedSlice<T>(name: string, fetcher: () => Promise<T>, empty: T): Promise<T> {
  try {
    const { value } = await cacheThrough(`search-index:${name}`, TTL, fetcher);
    return value;
  } catch {
    return empty;
  }
}

/** 全局搜索索引：文章 + 展品 + 图片 + 书签 */
export async function GET() {
  const [posts, tools, exhibits, images] = await Promise.all([
    cachedSlice<Index["posts"]>(
      "posts",
      async () => {
        const { items } = await listPosts();
        return items.map((post) => ({
          title: post.title,
          slug: post.slug,
          category: post.category,
          dateLabel: post.dateLabel,
        }));
      },
      [],
    ),

    cachedSlice<Index["tools"]>(
      "tools",
      async () => {
        const data = (await listTools()) as {
          groups?: { name: string; items: { name: string; url: string; description?: string }[] }[];
        };
        return (data.groups ?? []).flatMap((group) =>
          group.items.map((tool) => ({
            name: tool.name,
            url: tool.url,
            description: tool.description ?? "",
            category: group.name,
          })),
        );
      },
      [],
    ),

    cachedSlice<Index["exhibits"]>(
      "exhibits",
      async () => {
        const { items } = await listDemos();
        return items.map((item) => ({
          title: item.title,
          desc: item.desc,
          projectId: item.projectId,
          projectName: item.projectName,
          id: item.id,
          group: item.group,
          origin: item.origin,
        }));
      },
      [],
    ),

    cachedSlice<Index["images"]>(
      "images",
      async () => {
        const { sections } = await listGallerySections();
        return sections
          .flatMap((section) =>
            section.images.map((image, view) => ({ name: image.name, album: section.name, view })),
          )
          .slice(0, 1200);
      },
      [],
    ),
  ]);

  return NextResponse.json({ posts, tools, exhibits, images });
}
