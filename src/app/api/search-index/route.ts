import { NextResponse } from "next/server";
import { listPosts } from "@/lib/content";
import { listTools } from "@/lib/tools";
import { listDemos } from "@/lib/demos";

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
};

let cache: { at: number; value: Index } | null = null;
const TTL = 5 * 60_000;

/** 全局搜索索引：文章 + 展品 + 书签（五分钟缓存，任一路失败不影响其余） */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.value);
  }

  const value: Index = { posts: [], tools: [], exhibits: [] };

  try {
    const { items } = await listPosts();
    value.posts = items.map((post) => ({
      title: post.title,
      slug: post.slug,
      category: post.category,
      dateLabel: post.dateLabel,
    }));
  } catch {
    // 忽略：搜索索引尽力而为
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
    // 忽略
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
    // 忽略
  }

  cache = { at: Date.now(), value };
  return NextResponse.json(value);
}
