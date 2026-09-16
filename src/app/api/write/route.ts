import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProvider } from "@/lib/providers";
import { isWriteEnabled, WRITE_DISABLED_MESSAGE } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/** 删除文章：DELETE /api/write?slug=<不含扩展名>，先取 sha 再删 */
export async function DELETE(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim();

  if (
    !slug ||
    slug.startsWith(".") ||
    slug.includes("\\") ||
    slug.includes("..") ||
    /[\u0000-\u001f:*?"<>|]/.test(slug.replace(/\//g, ""))
  ) {
    return NextResponse.json({ error: "文件名包含不可用字符" }, { status: 400 });
  }

  try {
    const provider = await getProvider();
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "内容源未配置" }, { status: 400 });
    }

    const filePath = `${slug}.md`;
    let sha: string;
    try {
      const existing = await provider.getFile(filePath);
      sha = existing.sha;
    } catch {
      return NextResponse.json({ error: "文章不存在或已删除" }, { status: 404 });
    }

    await provider.deleteFile(filePath, `docs(study): 移除《${slug}》`, sha);
    return NextResponse.json({ ok: true, path: filePath, requestId: randomUUID() });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有写入权限（需要 repo 权限）" }, { status: 502 });
    }
    console.warn("[write] 删除失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 写作发布 API：新建 / 更新书房文章，直接写入配置的内容仓库。
 * 仅限本地服务使用（桌面 App / 本机开发），部署到 Vercel 前需自行加鉴权。
 * 请求体：{ slug: string, title: string, description?: string, date?: string, tags?: string[], body: string }
 * - slug 不带扩展名（如 "my-note"），保存为 <slug>.md
 * - 更新时带上 from 服务端返回的 sha，避免覆盖别人的修改
 */
export async function POST(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  let payload: {
    slug?: unknown;
    title?: unknown;
    description?: unknown;
    date?: unknown;
    tags?: unknown;
    body?: unknown;
    sha?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim())
    : [];
  const body = typeof payload.body === "string" ? payload.body : "";
  const sha = typeof payload.sha === "string" && payload.sha ? payload.sha : undefined;

  // 文件名从标题自动生成：只禁止路径不安全字符，兼容中文标点（：+、 等）
  if (
    !slug ||
    slug.startsWith(".") ||
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("..") ||
    /[\u0000-\u001f:*?"<>|]/.test(slug)
  ) {
    return NextResponse.json({ error: "文件名包含不可用字符" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "缺少 title" }, { status: 400 });
  }
  if (!body.trim()) {
    return NextResponse.json({ error: "正文不能为空" }, { status: 400 });
  }

  const frontMatterLines = ["---", `title: "${title.replace(/"/g, '\\"')}"`];
  if (description) frontMatterLines.push(`description: "${description.replace(/"/g, '\\"')}"`);
  frontMatterLines.push(`date: ${date || new Date().toISOString().slice(0, 10)}`);
  if (tags.length > 0) frontMatterLines.push(`tags: [${tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`);
  frontMatterLines.push("---", "");
  const content = `${frontMatterLines.join("\n")}\n${body.replace(/\r\n/g, "\n")}\n`;

  try {
    const provider = await getProvider();
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "内容源未配置，无法发布" }, { status: 400 });
    }

    const filePath = `${slug}.md`;
    let existingSha: string | undefined;
    if (!sha) {
      try {
        const existing = await provider.getFile(filePath);
        existingSha = existing.sha || undefined;
      } catch {
        existingSha = undefined; // 文件不存在 → 新建
      }
    }

    const contentBase64 = Buffer.from(content, "utf8").toString("base64");
    const message = existingSha || sha ? `docs(study): 更新《${title}》` : `docs(study): 新增《${title}》`;
    await provider.putFile(filePath, contentBase64, message, sha ?? existingSha);

    return NextResponse.json({
      ok: true,
      path: filePath,
      sha: "saved",
      editUrl: `/study/${encodeURIComponent(slug)}`,
      requestId: randomUUID(),
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有写入权限（需要 repo 权限）" }, { status: 502 });
    }
    if (status === 422) {
      return NextResponse.json({ error: "仓库端已更新（sha 过期），请刷新后重试" }, { status: 409 });
    }
    console.warn("[write] 发布失败：", message);
    return NextResponse.json({ error: "发布失败，请稍后再试" }, { status: 500 });
  }
}
