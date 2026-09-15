import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProvider } from "@/lib/providers";
import { isWriteEnabled, WRITE_DISABLED_MESSAGE } from "@/lib/write-guard";
import { resolveGalleryConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * 画廊上传：把图片写入图床仓库。
 * 请求体：{ filename: string, contentBase64: string, dir?: string }
 * - dir 为画廊仓库内的子目录（相对路径），空串 = 仓库根
 * - 文件名冲突时自动追加时间戳，不覆盖既有文件
 * 仅限本地服务使用；公开部署前需加鉴权。
 */
export async function POST(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  let payload: { filename?: unknown; contentBase64?: unknown; dir?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const filenameRaw = typeof payload.filename === "string" ? payload.filename.trim() : "";
  const contentBase64 = typeof payload.contentBase64 === "string" ? payload.contentBase64 : "";
  const dir = typeof payload.dir === "string" ? payload.dir.replace(/^\/+|\/+$/g, "") : "";

  const baseName = filenameRaw.split(/[\\/]/).pop() ?? "";
  if (!baseName || !IMAGE_RE.test(baseName)) {
    return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
  }
  if (baseName.includes("..")) {
    return NextResponse.json({ error: "文件名不合法" }, { status: 400 });
  }
  if (!contentBase64) {
    return NextResponse.json({ error: "缺少文件内容" }, { status: 400 });
  }

  try {
    const gallery = await resolveGalleryConfig();
    const provider = await getProvider(gallery.provider, gallery);
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "图床仓库未配置" }, { status: 400 });
    }

    // 目标路径：dir/名字；若已存在则加时间戳（-HHmmss），保证不覆盖
    const dot = baseName.lastIndexOf(".");
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : "";
    const dirPrefix = dir ? `${dir}/` : "";

    let filePath = `${dirPrefix}${baseName}`;
    let sha: string | undefined;
    try {
      const existing = await provider.getFile(filePath);
      sha = existing.sha || undefined;
    } catch {
      sha = undefined;
    }
    if (sha) {
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
      filePath = `${dirPrefix}${stem}-${stamp}${ext}`;
    }

    await provider.putFile(
      filePath,
      contentBase64,
      `chore(gallery): 上传图片 ${filePath.split("/").pop()}`,
    );

    return NextResponse.json({ ok: true, path: filePath, requestId: randomUUID() });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有图床仓库的写入权限" }, { status: 502 });
    }
    console.warn("[upload] 上传失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "上传失败，请稍后再试" }, { status: 500 });
  }
}
