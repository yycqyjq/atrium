/* QQ空间回忆馆 · 抓取结果（msglist 原始结构，展品可直接导入） */
import { NextResponse } from "next/server";
import { dataPayload } from "@/lib/qzone-bridge";

export const dynamic = "force-dynamic";

export function GET() {
  const payload = dataPayload();
  if (!payload) return NextResponse.json({ error: "尚未完成抓取" }, { status: 409 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
