/* QQ空间回忆馆 · 动作入口：qr-start / fetch-start / stop */
import { NextResponse } from "next/server";
import { setCredentials, snapshot, startFetch, startQr, stop } from "@/lib/qzone-bridge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { action?: string; p_skey?: string; uin?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const action = body.action ?? "";
  if (action === "cookie") {
    const ok = setCredentials(body.p_skey ?? "", body.uin ?? "");
    if (!ok) return NextResponse.json({ error: "p_skey 或 uin 格式不对" }, { status: 400 });
    return NextResponse.json(snapshot(), { headers: { "Cache-Control": "no-store" } });
  }
  if (action === "qr-start") startQr();
  else if (action === "fetch-start") startFetch();
  else if (action === "stop") stop();
  else return NextResponse.json({ error: "未知动作" }, { status: 400 });
  return NextResponse.json(snapshot(), { headers: { "Cache-Control": "no-store" } });
}
