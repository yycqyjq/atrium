import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { isWriteEnabled, WRITE_DISABLED_MESSAGE } from "@/lib/write-guard";
import { resolveGalleryConfig, galleryDir } from "@/lib/config";
import { bustGalleryCache } from "@/lib/gallery";

export const dynamic = "force-dynamic";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * 画廊删除：从图床仓库移除图片文件。
 * 请求体：{ path: string }（画廊仓库内相对路径）
 * 仅限本地服务使用；公开部署前需加鉴权。
 */
export async function POST(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  let payload: { path?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const rel = (typeof payload.path === "string" ? payload.path.trim() : "").replace(
    /^\/+|\/+$/g,
    "",
  );
  if (!rel || rel.includes("..") || rel.split("/").some((seg) => !seg || seg.startsWith("."))) {
    return NextResponse.json({ error: "路径不合法" }, { status: 400 });
  }
  if (!IMAGE_RE.test(rel)) {
    return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
  }

  const rootDir = (await galleryDir()).replace(/^\/+|\/+$/g, "");
  if (rootDir && !rel.startsWith(`${rootDir}/`)) {
    return NextResponse.json({ error: "只能移除画廊目录内的图片" }, { status: 400 });
  }

  try {
    const gallery = await resolveGalleryConfig();
    const provider = await getProvider(gallery.provider, gallery);
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "图床仓库未配置" }, { status: 400 });
    }

    const file = await provider.getFile(rel);
    const name = rel.split("/").pop() ?? rel;
    await provider.deleteFile(rel, `chore(gallery): 移除图片 ${name}`, file.sha);
    bustGalleryCache();
    return NextResponse.json({ ok: true, path: rel, name });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有图床仓库的写入权限" }, { status: 502 });
    }
    if (status === 404) {
      return NextResponse.json({ error: "文件不存在（可能已被移除）" }, { status: 404 });
    }
    console.warn("[gallery/delete] 失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "移除失败，请稍后再试" }, { status: 500 });
  }
}
