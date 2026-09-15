import { NextResponse } from "next/server";
import { listPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts?limit=20&provider=github
 * 文章列表（服务端已带 60s 缓存与降级语义）
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 20;
  const provider = url.searchParams.get("provider") ?? undefined;

  const { items, reason } = await listPosts({ limit, provider });
  return NextResponse.json({ items, reason, total: items.length });
}
