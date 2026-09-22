/* QQ空间回忆馆 · 扫码/抓取状态（展品同源轮询） */
import { NextResponse } from "next/server";
import { snapshot } from "@/lib/qzone-bridge";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(snapshot(), { headers: { "Cache-Control": "no-store" } });
}
