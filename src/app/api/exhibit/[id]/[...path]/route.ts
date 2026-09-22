/* 展品后端通用分发：/api/exhibit/<id>/* → 展品声明的 backend.handle()
 * 展品后端模块的加载与信任模型见 src/lib/exhibit-backend.ts。 */
import { NextResponse } from "next/server";
import { loadBackend, backendsEnabled, type ExhibitBackendRequest } from "@/lib/exhibit-backend";

export const dynamic = "force-dynamic";

async function dispatch(request: Request, ctx: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path } = await ctx.params;
  if (!backendsEnabled()) {
    return NextResponse.json({ error: "展品后端已关闭" }, { status: 503 });
  }
  const backend = await loadBackend(id);
  if (!backend) {
    return NextResponse.json({ error: "该展品未提供后端模块" }, { status: 404 });
  }
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  let body: unknown = null;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.json().catch(() => null);
  }
  const req: ExhibitBackendRequest = {
    method,
    path: (path ?? []).join("/"),
    query: Object.fromEntries(url.searchParams),
    body,
  };
  try {
    const out = await backend.handle(req);
    const status = out.status ?? 200;
    if (out.bytes) {
      return new Response(out.bytes as unknown as BodyInit, {
        status,
        headers: {
          "Content-Type": out.contentType ?? "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(out.json ?? {}, { status, headers: { "Cache-Control": "no-store" } });
  } catch (exc) {
    return NextResponse.json(
      { error: `展品后端异常：${exc instanceof Error ? exc.message : String(exc)}` },
      { status: 500 },
    );
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
