import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { isWriteEnabled, WRITE_DISABLED_MESSAGE } from "@/lib/write-guard";
import { resolveGalleryConfig, galleryDir } from "@/lib/config";
import { bustGalleryCache } from "@/lib/gallery";

export const dynamic = "force-dynamic";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_NAME = 120;

/**
 * 画廊重命名：同一相册内改图片文件名。
 * 请求体：{ path: string, name: string }
 * - path 为画廊仓库内的相对路径（含扩展名）
 * - name 为新文件名；不带扩展名时自动沿用原扩展名
 * 仅限本地服务使用；公开部署前需加鉴权。
 */
export async function POST(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  let payload: { path?: unknown; name?: unknown };
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

  // 只允许改画廊目录内的文件
  const rootDir = (await galleryDir()).replace(/^\/+|\/+$/g, "");
  if (rootDir && !rel.startsWith(`${rootDir}/`)) {
    return NextResponse.json({ error: "只能修改画廊目录内的图片" }, { status: 400 });
  }

  const segments = rel.split("/");
  const oldName = segments[segments.length - 1];
  const parentDir = segments.slice(0, -1).join("/");

  // 新文件名：去路径成分、去首尾空白与尾点；缺扩展名时沿用原扩展名
  let newName = (typeof payload.name === "string" ? payload.name : "").split(/[\\/]/).pop() ?? "";
  newName = newName.trim().replace(/[. ]+$/g, "");
  const dot = oldName.lastIndexOf(".");
  const ext = dot > 0 ? oldName.slice(dot) : "";
  if (newName && !IMAGE_RE.test(newName)) newName = `${newName}${ext}`;
  if (!newName || newName.startsWith(".") || newName.length > MAX_NAME || !IMAGE_RE.test(newName)) {
    return NextResponse.json({ error: "新名字不合法" }, { status: 400 });
  }
  const newRel = parentDir ? `${parentDir}/${newName}` : newName;
  if (newRel === rel) {
    return NextResponse.json({ error: "名字没有变化" }, { status: 400 });
  }

  try {
    const gallery = await resolveGalleryConfig();
    const provider = await getProvider(gallery.provider, gallery);
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "图床仓库未配置" }, { status: 400 });
    }

    // 同目录冲突检查（不区分大小写，避免与既有文件撞名）
    const entries = await provider.listDir(parentDir);
    if (
      entries.some(
        (entry) => entry.name.toLowerCase() === newName.toLowerCase() && entry.name !== oldName,
      )
    ) {
      return NextResponse.json({ error: "同名文件已存在" }, { status: 409 });
    }

    await provider.renameFile(rel, newRel, `chore(gallery): 重命名 ${oldName} → ${newName}`);
    bustGalleryCache();
    return NextResponse.json({ ok: true, path: newRel, name: newName });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有图床仓库的写入权限" }, { status: 502 });
    }
    if (status === 404) {
      return NextResponse.json({ error: "原文件不存在（可能已被改名或删除）" }, { status: 404 });
    }
    console.warn("[gallery/rename] 失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "改名失败，请稍后再试" }, { status: 500 });
  }
}
