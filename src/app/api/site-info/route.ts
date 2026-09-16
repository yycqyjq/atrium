import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SiteInfo = { title: string; description: string; host: string };

const cache = new Map<string, { at: number; data: SiteInfo }>();
const TTL = 10 * 60 * 1000;
const MAX_BYTES = 512 * 1024;

function isPrivateHost(host: string) {
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host === "::1" || host.endsWith(".local")) return true;
  return false;
}

function decodeEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function pick(html: string, re: RegExp) {
  const match = html.match(re);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : "";
}

/**
 * 站点信息解析（工具房「粘贴网址自动带回标题与描述」的数据源）：
 * 服务端抓取目标网页，解析 og:title / <title> 与 meta description。
 * 带内网地址防护、512KB 截断、8 秒超时与 10 分钟内存缓存。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("url") ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ ok: false, error: "网址需以 http(s):// 开头" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "网址不合法" }, { status: 400 });
  }
  if (isPrivateHost(target.hostname)) {
    return NextResponse.json({ ok: false, error: "不支持本地或内网地址" }, { status: 400 });
  }

  const key = target.href;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ ok: true, ...hit.data, cached: true });
  }

  try {
    const res = await fetch(target.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Atrium/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `目标站点返回 ${res.status}` }, { status: 502 });
    }

    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES);
    const headerCharset = /charset=([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1];
    let charset = headerCharset?.toLowerCase();
    if (!charset) {
      const sniff = buf.subarray(0, 2048).toString("latin1");
      charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1]?.toLowerCase();
    }
    let html: string;
    try {
      html = new TextDecoder(charset && charset !== "utf8" ? charset : "utf-8", { fatal: false }).decode(buf);
    } catch {
      html = buf.toString("utf8");
    }
    if (!charset && html.includes("\uFFFD")) {
      html = new TextDecoder("gb18030").decode(buf); // 中文老站兜底
    }

    const head = html.slice(0, 200_000);
    const title =
      pick(head, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ||
      pick(head, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      pick(head, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description =
      pick(head, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ||
      pick(head, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      pick(head, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i) ||
      pick(head, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    const data: SiteInfo = {
      title: title.slice(0, 120),
      description: description.slice(0, 300),
      host: target.hostname.replace(/^www\./, ""),
    };
    if (cache.size > 120) cache.clear();
    cache.set(key, { at: Date.now(), data });
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "解析失败，请检查网址或稍后再试" }, { status: 502 });
  }
}
