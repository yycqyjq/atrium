/* QQ空间回忆馆 · 登录二维码 */
import { NextResponse } from "next/server";
import { currentQrPng } from "@/lib/qzone-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const png = await currentQrPng();
  if (!png) return NextResponse.json({ error: "尚未生成二维码" }, { status: 404 });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
