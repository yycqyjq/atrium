/**
 * 「服务端抓取用户提供的 URL」共用的安全护栏。
 * 使用方：/api/upload（转存外链图片）与 /api/site-info（粘贴网址带回标题）。
 *
 * 防护分三层，缺一不可：
 * 1. 字面量：协议白名单 + 本机/内网地址字面量（v4 私有段、v6 本地段、localhost 系）；
 * 2. 解析：域名解析出的所有地址再过一遍内网检查（防 DNS 解析绕过字面量检查）；
 * 3. 重定向：不自动跟随，逐跳重新过 1 与 2（防 302 跳进内网）。
 */
import dns from "node:dns/promises";

export class UrlGuardError extends Error {
  /** 跨 chunk 的可靠标记：Next 会把模块打进多个 chunk，instanceof 会失灵 */
  readonly guard = true as const;
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** 内网/保留地址判断：v4 私有段、v6 本地段、IPv4-mapped、localhost 系 */
/** 跨 chunk 可靠的判断：instanceof 在多 chunk 打包下会失灵，靠实例标记兜底 */
export function isUrlGuardError(err: unknown): err is UrlGuardError {
  return (
    err instanceof UrlGuardError ||
    (typeof err === "object" && err !== null && (err as { guard?: unknown }).guard === true)
  );
}

export function isPrivateAddress(ip: string): boolean {
  const raw = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254)
    );
  }
  if (raw === "::" || raw === "::1") return true;
  if (raw.startsWith("::ffff:")) return isPrivateAddress(raw.slice(7)); // IPv4-mapped
  if (/^f[cd]/.test(raw)) return true; // fc00::/7 唯一本地
  if (/^fe[89ab]/.test(raw)) return true; // fe80::/10 链路本地
  return false;
}

/** 协议与字面量校验；通过则返回解析后的 URL，不通过抛 UrlGuardError */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlGuardError("地址不合法");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError("只支持 http/https 地址");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("[") || // IPv6 字面量（含 ::1）
    isPrivateAddress(host)
  ) {
    throw new UrlGuardError("不支持本机 / 内网地址");
  }
  return url;
}

/** 域名解析出的所有地址再过一遍内网检查（纯 IP 字面量已在 assertPublicUrl 查过） */
export async function assertPublicHost(host: string): Promise<void> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return;
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new UrlGuardError("域名无法解析");
  }
  for (const { address } of addrs) {
    if (isPrivateAddress(address)) throw new UrlGuardError("地址解析到内网，已拒绝");
  }
}

/** 挖出 fetch 失败的真实原因（Node 只抛 fetch failed，有用信息在 cause 里） */
export function fetchFailureReason(err: unknown): string {
  const cause = (err as { cause?: unknown } | null)?.cause;
  const raw =
    (cause instanceof Error && cause.message) ||
    (err instanceof Error && err.message) ||
    String(err);
  return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
}

const MAX_REDIRECTS = 3;

/** 带护栏的抓取：重定向手动跟随，每一跳都重新过字面量与解析检查 */
export async function guardedFetch(
  rawUrl: string,
  init: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 15_000;
  let current = assertPublicUrl(rawUrl);
  for (let hop = 0; ; hop += 1) {
    if (hop > MAX_REDIRECTS) throw new UrlGuardError("重定向次数过多");
    await assertPublicHost(current.hostname);
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: init.headers,
      cache: "no-store",
    });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) throw new UrlGuardError(`目标返回 ${res.status}`);
    current = assertPublicUrl(new URL(location, current).href);
  }
}
