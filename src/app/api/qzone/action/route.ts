/* QQ空间回忆馆 · 动作入口：qr-start / fetch-start / stop */
import { NextResponse } from "next/server";
import { doAction } from "@/lib/qzone-bridge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { action?: string; p_skey?: string; uin?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const action = body.action ?? "";
  if (action === "cookie" && (!body.p_skey || !body.uin)) {
    return NextResponse.json({ error: "p_skey 或 uin 缺失" }, { status: 400 });
  }
  return NextResponse.json(await doAction(action, body), { headers: { "Cache-Control": "no-store" } });
}
