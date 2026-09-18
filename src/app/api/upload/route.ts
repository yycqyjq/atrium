import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProvider } from "@/lib/providers";
import { isWriteEnabled, WRITE_DISABLED_MESSAGE } from "@/lib/write-guard";
import { resolveGalleryConfig } from "@/lib/config";
import { bustGalleryCache, galleryArticleUrl } from "@/lib/gallery";

export const dynamic = "force-dynamic";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** content-type → 扩展名；同时充当「只收这几种图片」的白名单 */
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/** 预期内的失败：消息直接回给调用方，便于逐张显示原因 */
class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * 只允许公网 http(s)。这个接口是「给个地址，服务端去取」，不加限制就成了内网探测跳板，
 * 本机/内网地址一律拒掉。
 */
function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UploadError("图片地址不合法");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UploadError("只支持 http/https 图片地址");
  }
  const host = url.hostname.toLowerCase();
  const isPrivateV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(host)
    ? (() => {
        const [a, b] = host.split(".").map(Number);
        return (
          a === 0 ||
          a === 10 ||
          a === 127 ||
          (a === 192 && b === 168) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 169 && b === 254)
        );
      })()
    : false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("[") || // IPv6 字面量（含 ::1）
    isPrivateV4
  ) {
    throw new UploadError("不支持本机 / 内网地址");
  }
  return url;
}

/** 已经在图床仓库里的图不用再转一次 */
function isOwnGalleryUrl(raw: string, cfg: { owner: string; repo: string }): boolean {
  return raw.includes(`${cfg.owner}/${cfg.repo}`);
}

/**
 * 把 fetch 的失败原因挖出来。Node 的 fetch 只抛 `TypeError: fetch failed`，
 * 真正有用的信息（证书、超时、DNS）在 cause 里——不挖出来，界面只能显示「网络不通」，
 * 排查时等于没有线索。
 */
function fetchFailureReason(err: unknown): string {
  const cause = (err as { cause?: unknown } | null)?.cause;
  const raw =
    (cause instanceof Error && cause.message) ||
    (err instanceof Error && err.message) ||
    String(err);
  return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
}

/** 从 URL 路径里取文件名；取不到或不带图片扩展名时按 content-type 兜底 */
function fileNameFromUrl(url: URL, ext: string): string {
  let base = "";
  try {
    base = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  } catch {
    base = "";
  }
  base = base.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  if (!base || base.includes("..") || !IMAGE_RE.test(base)) {
    return `img-${Date.now()}${ext}`;
  }
  return base;
}

/**
 * 画廊上传：把图片写入图床仓库。
 *
 * 请求体二选一：
 * - `{ filename: string, contentBase64: string, dir?: string }` —— 本地选文件直传
 * - `{ sourceUrl: string, dir?: string }`                      —— 抓取外链图片转存
 *
 * 公共约定：
 * - dir 为画廊仓库内的子目录（相对路径），空串 = 仓库根
 * - 文件名冲突时自动追加时间戳，不覆盖既有文件
 * - 响应带 url：可直接写进文章正文的引用地址
 *
 * 仅限本地服务使用；公开部署前需加鉴权。
 */
export async function POST(request: Request) {
  if (!isWriteEnabled()) {
    return NextResponse.json({ error: WRITE_DISABLED_MESSAGE }, { status: 403 });
  }

  let payload: {
    filename?: unknown;
    contentBase64?: unknown;
    sourceUrl?: unknown;
    dir?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const dir = typeof payload.dir === "string" ? payload.dir.replace(/^\/+|\/+$/g, "") : "";
  const sourceUrl = typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() : "";
  const filenameRaw = typeof payload.filename === "string" ? payload.filename.trim() : "";
  const contentBase64 = typeof payload.contentBase64 === "string" ? payload.contentBase64 : "";

  if (dir.includes("..")) {
    return NextResponse.json({ error: "目录名不合法" }, { status: 400 });
  }
  if (!sourceUrl && !contentBase64) {
    return NextResponse.json({ error: "缺少文件内容" }, { status: 400 });
  }

  try {
    const gallery = await resolveGalleryConfig();
    const provider = await getProvider(gallery.provider, gallery);
    if (!(await provider.isConfigured())) {
      return NextResponse.json({ error: "图床仓库未配置" }, { status: 400 });
    }

    let baseName: string;
    let base64: string;

    if (sourceUrl) {
      // 转存分支：服务端把图抓下来，再当作普通上传写进图床
      if (isOwnGalleryUrl(sourceUrl, gallery)) {
        return NextResponse.json({ ok: true, skipped: true, reason: "图片已在图床仓库" });
      }
      const url = assertPublicUrl(sourceUrl);

      let res: Response;
      try {
        res = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { Accept: "image/*", "User-Agent": "atrium-image-transfer" },
        });
      } catch (err) {
        const reason = fetchFailureReason(err);
        console.warn("[upload] 抓取失败：", sourceUrl, reason);
        throw new UploadError(`抓取失败：${reason}`, 502);
      }
      if (!res.ok) throw new UploadError(`图片源返回 ${res.status}`, 502);

      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const typeExt = EXT_BY_TYPE[type];
      if (!typeExt) {
        throw new UploadError(`不是支持的图片类型（${type || "未声明"}）`);
      }
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_BYTES) throw new UploadError("图片超过 20MB");

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0) throw new UploadError("图片内容为空", 502);
      if (buf.byteLength > MAX_BYTES) throw new UploadError("图片超过 20MB");

      baseName = fileNameFromUrl(url, typeExt);
      base64 = buf.toString("base64");
    } else {
      // 本地选文件分支：沿用原有校验
      const raw = filenameRaw.split(/[\\/]/).pop() ?? "";
      if (!raw || !IMAGE_RE.test(raw)) {
        throw new UploadError("只支持图片文件");
      }
      if (raw.includes("..")) throw new UploadError("文件名不合法");
      baseName = raw;
      base64 = contentBase64;
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
      base64,
      `chore(gallery): 上传图片 ${filePath.split("/").pop()}`,
    );

    bustGalleryCache();
    return NextResponse.json({
      ok: true,
      path: filePath,
      url: galleryArticleUrl(gallery, filePath),
      requestId: randomUUID(),
    });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有图床仓库的写入权限" }, { status: 502 });
    }
    console.warn("[upload] 上传失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "上传失败，请稍后再试" }, { status: 500 });
  }
}
