import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.ATRIUM_DATA_DIR || path.join(process.cwd(), "data");
const CACHE_DIR = path.join(DATA_DIR, "icon-cache");
const MAX_BYTES = 300 * 1024;

/** 候选源：站点直取 → 国内聚合服务 → 国际服务 */
const candidates = (domain: string) => [
  `https://${domain}/favicon.ico`,
  `https://favicon.cccyun.cc/${domain}`,
  `https://favicon.im/${domain}`,
];

function extFor(contentType: string): string {
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("icon") || contentType.includes("ico")) return "ico";
  return "img";
}

const TYPE_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
};

function serve(bytes: Uint8Array, ext: string) {
  // 拷贝为独立的 ArrayBuffer（满足 BodyInit 类型）
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new NextResponse(ab, {
    headers: {
      "Content-Type": TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

/**
 * 站点图标（favicon）代理：按域名抓取并落盘缓存。
 * 优先站点自身 /favicon.ico，失败自动降级聚合服务；全部失败返回 404（前端显示首字兜底）。
 * 只允许 https + 域名白名单形态，作为本地服务的轻量能力。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = (searchParams.get("d") ?? "").trim().toLowerCase();
  if (
    !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain) ||
    domain.length > 100 ||
    domain.includes("..")
  ) {
    return NextResponse.json({ error: "域名不合法" }, { status: 400 });
  }

  // 磁盘缓存命中
  try {
    const files = await fs.readdir(CACHE_DIR).catch(() => [] as string[]);
    const hit = files.find((f) => f.startsWith(`${domain}.`));
    if (hit) {
      const bytes = await fs.readFile(path.join(CACHE_DIR, hit));
      return serve(new Uint8Array(bytes), hit.split(".").pop() ?? "img");
    }
  } catch {
    /* 缓存读取失败则继续抓取 */
  }

  for (const url of candidates(domain)) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; atrium-icon/1.0)" },
      });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (!/image\//i.test(type) && !/octet-stream/i.test(type)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) continue;
      // 跳过聚合服务的占位图（灰圆 + 斜体 f 的 257B SVG）
      if (buf.includes('<circle cx="50" cy="50" r="40" fill="#808080"')) continue;
      const ext = extFor(type);
      await fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
      await fs.writeFile(path.join(CACHE_DIR, `${domain}.${ext}`), buf).catch(() => {});
      return serve(new Uint8Array(buf), ext);
    } catch {
      /* 尝试下一个候选源 */
    }
  }

  return NextResponse.json({ error: "未找到图标" }, { status: 404 });
}
