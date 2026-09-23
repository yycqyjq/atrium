/* 展品后端通用分发：/api/exhibit/<id>/* → 展品声明的 backend.handle()
 * 展品后端模块的加载与信任模型见 src/lib/exhibit-backend.ts。 */
import { NextResponse } from "next/server";
import {
  loadBackend,
  backendsEnabled,
  HANDLE_TIMEOUT_MS,
  type ExhibitBackendRequest,
} from "@/lib/exhibit-backend";

export const dynamic = "force-dynamic";

/** 给展品 handle 加超时护栏：无响应也要让请求返回（挂死后底层 Promise 仍在跑，JS 无法强杀函数，但不占着 HTTP 请求） */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const exc = new Error(`展品后端处理超时（${Math.round(ms / 1000)}s 无响应）`);
      exc.name = "HandleTimeout";
      reject(exc);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

async function dispatch(
  request: Request,
  ctx: { params: Promise<{ id: string; path?: string[] }> },
) {
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
    const out = await withTimeout(backend.handle(req), HANDLE_TIMEOUT_MS);
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
    const timedOut = exc instanceof Error && exc.name === "HandleTimeout";
    return NextResponse.json(
      {
        error: timedOut
          ? exc.message
          : `展品后端异常：${exc instanceof Error ? exc.message : String(exc)}`,
      },
      { status: timedOut ? 504 : 500 },
    );
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
