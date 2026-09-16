import { NextResponse } from "next/server";
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

let cache: { at: number; value: Index } | null = null;
const TTL = 5 * 60_000;

/** 全局搜索索引：文章 + 展品 + 图片 + 书签（五分钟缓存，任一路失败不影响其余） */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.value);
  }

  const value: Index = { posts: [], tools: [], exhibits: [], images: [] };

  try {
    const { items } = await listPosts();
    value.posts = items.map((post) => ({
      title: post.title,
      slug: post.slug,
      category: post.category,
      dateLabel: post.dateLabel,
    }));
  } catch {
    // 抓取失败（抖动/限流）：沿用上次索引，避免整块消失
    value.posts = cache?.value.posts ?? [];
  }

  try {
    const data = (await listTools()) as {
      groups?: { name: string; items: { name: string; url: string; description?: string }[] }[];
    };
    value.tools = (data.groups ?? []).flatMap((group) =>
      group.items.map((tool) => ({
        name: tool.name,
        url: tool.url,
        description: tool.description ?? "",
        category: group.name,
      })),
    );
  } catch {
    value.tools = cache?.value.tools ?? [];
  }

  try {
    const { items } = await listDemos();
    value.exhibits = items.map((item) => ({
      title: item.title,
      desc: item.desc,
      projectId: item.projectId,
      projectName: item.projectName,
      id: item.id,
      group: item.group,
      origin: item.origin,
    }));
  } catch {
    value.exhibits = cache?.value.exhibits ?? [];
  }

  try {
    const { sections } = await listGallerySections();
    value.images = sections
      .flatMap((section) =>
        section.images.map((image, view) => ({ name: image.name, album: section.name, view })),
      )
      .slice(0, 1200);
  } catch {
    value.images = cache?.value.images ?? [];
  }

  cache = { at: Date.now(), value };
  return NextResponse.json(value);
}
