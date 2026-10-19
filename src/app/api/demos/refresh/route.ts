import { NextResponse } from "next/server";
import { listDemos } from "@/lib/demos";

export const dynamic = "force-dynamic";

/**
 * POST /api/demos/refresh：工坊列表「刷新」按钮——绕过清单缓存强制回源。
 * 仅开放 POST：避免预取 / 爬虫误触发回源。
 * 回源成功：200 + { stale, errors, items }；stale=true 表示仍端出了旧数据（仓库有问题）。
 * 回源失败且无旧数据可端：502 + { error }（客户端保持现有列表不变）。
 */
export async function POST() {
  try {
    const result = await listDemos({ fresh: true });
    return NextResponse.json({
      stale: result.stale ?? false,
      errors: result.errors,
      items: result.items.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "回源失败" },
      { status: 502 },
    );
  }
}
