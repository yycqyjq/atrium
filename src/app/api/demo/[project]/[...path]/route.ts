import { NextResponse } from "next/server";
import { resolveDemoProjects } from "@/lib/config";
import { fetchDemoFile, isSafeRelPath } from "@/lib/demos";

export const dynamic = "force-dynamic";

/**
 * GET /api/demo/<project>/<path…>：把组件仓库里的文件按正确 MIME 转发给页面。
 * 用于：展品模块的动态 import、样式注入、源码视图。?fresh=1 绕过缓存。
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ project: string; path: string[] }> },
) {
  const { project: projectId, path: segments } = await ctx.params;

  const projects = await resolveDemoProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project || project.kind !== "repo") {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const rel = (segments ?? []).join("/");
  if (!isSafeRelPath(rel)) {
    return NextResponse.json({ error: "路径不合法" }, { status: 400 });
  }

  const fresh = new URL(request.url).searchParams.has("fresh");
  const file = await fetchDemoFile(project, rel, fresh);
  if (!file) {
    return NextResponse.json({ error: "文件不存在或读取失败" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", file.type);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  if (file.type.startsWith("text/html")) {
    // HTML 场景保底隔离（工坊不用 iframe，此处防直接打开被当作同源页面）
    headers.set("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-modals");
  }

  return new NextResponse(file.buf as unknown as BodyInit, { status: 200, headers });
}
