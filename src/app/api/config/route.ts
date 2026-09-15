import { NextResponse } from "next/server";
import { readPublicConfig, updateConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/** GET /api/config：站点配置的安全视图（token 只返回是否已设置） */
export async function GET() {
  return NextResponse.json(await readPublicConfig());
}

/** POST /api/config：合并式更新（绝不整体覆盖） */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "请求体必须是对象" }, { status: 400 });
  }
  const saved = await updateConfig(body as Record<string, unknown>);
  return NextResponse.json(saved);
}
