/**
 * QQ空间回忆馆 · 中庭原生抓取通道
 *
 * 把 bricks「QQ空间回忆馆」桥接服务的逻辑移植为服务端模块：
 * 官方 ptlogin 扫码登录 → 分页抓取说说（含图片与评论，内置限速）→ 展品同源拉取。
 *
 * 关键工程事实：
 * - ptlogin2 域有 TLS 指纹风控：undici fetch 直接 403，node:https + 浏览器 cipher 套件可过；
 *   user.qzone.qq.com 的 msglist 接口对 undici fetch 不拦（实测返回业务 JSON）。
 * - Cookie 用模块内扁平 jar（ptlogin / graph / qzone 域票据合并携带，qzone 接口不校验多余 cookie）；
 * - 状态挂 globalThis：dev 热重载会重置（重新扫码即可），standalone / 桌面生产态单进程稳定；
 * - 仅服务本机使用者，抓取数据不落盘、不出本机。
 */

import https from "node:https";

const APPID = "549000912";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type QzonePhase = "idle" | "qr" | "confirm" | "logged" | "fetching" | "done" | "error";

interface QzoneBridgeState {
  phase: QzonePhase;
  message: string;
  qrPng: Uint8Array | null;
  qrsig: string;
  cookies: Map<string, string>;
  uin: string;
  gtk: string;
  entries: unknown[];
  total: number | null;
  pos: number;
  stopFlag: boolean;
  worker: Promise<void> | null;
}

const g = globalThis as { __atriumQzoneBridge?: QzoneBridgeState };

export const qzoneState: QzoneBridgeState = (g.__atriumQzoneBridge ??= {
  phase: "idle",
  message: "",
  qrPng: null,
  qrsig: "",
  cookies: new Map(),
  uin: "",
  gtk: "",
  entries: [],
  total: null,
  pos: 0,
  stopFlag: false,
  worker: null,
});

export function snapshot(): {
  phase: QzonePhase;
  message: string;
  uin: string;
  pos: number;
  total: number | null;
  count: number;
} {
  return {
    phase: qzoneState.phase,
    message: qzoneState.message,
    uin: qzoneState.uin,
    pos: qzoneState.pos,
    total: qzoneState.total,
    count: qzoneState.entries.length,
  };
}

function setPhase(phase: QzonePhase, message = ""): void {
  qzoneState.phase = phase;
  qzoneState.message = message;
}

function hash33(s: string): number {
  let e = 0;
  for (const c of s) e += (e << 5) + c.charCodeAt(0);
  return 2147483647 & e;
}

function absorbCookies(res: import("node:http").IncomingMessage): void {
  for (const sc of res.headers["set-cookie"] ?? []) {
    const pair = sc.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > 0) qzoneState.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

function cookieHeader(): string {
  return [...qzoneState.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** ptlogin2 域的 TLS 指纹风控：undici fetch 直接 403，node:https + 浏览器 cipher 套件可过 */
const secureAgent = new https.Agent({
  ciphers:
    "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES256-GCM-SHA384",
  keepAlive: true,
});

interface HttpResult {
  status: number;
  body: Buffer;
}

function httpsRequest(url: string, referer: string): Promise<HttpResult & { res: import("node:http").IncomingMessage }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        agent: secureAgent,
        headers: {
          "User-Agent": UA,
          Referer: referer,
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9",
          ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          absorbCookies(res);
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks), res });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/** check_sig 登录跳转链：手动跟随（≤6 跳），逐跳吸收票据 */
async function httpsFollow(url: string, referer: string): Promise<void> {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const { status, res } = await httpsRequest(current, referer);
    if (status < 300 || status >= 400) return;
    const location = res.headers.location;
    if (!location) return;
    current = new URL(location, current).toString();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- Python 桥智能分发 ----------
 * Python requests 的 TLS 指纹能过 ptlogin 扫码风控（Node 过不了），msglist 抓取 Node 可达。
 * 策略：本机 18772 有 Python 桥在线 → 扫码/抓取全流程走 Python（扫码全自动）；
 * 不在线 → 走上面的 Node 原生通道（Cookie 粘贴登录 + fetch 抓取）。展品对分发无感知。
 */

const PY_BRIDGE = "http://127.0.0.1:18772";
const pyProbeCache: { at: number; ok: boolean } = { at: 0, ok: false };

async function pyBridgeOnline(): Promise<boolean> {
  if (Date.now() - pyProbeCache.at < 5000) return pyProbeCache.ok;
  let ok = false;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 800);
    const res = await fetch(`${PY_BRIDGE}/api/state`, { signal: ctl.signal });
    clearTimeout(timer);
    ok = res.ok;
  } catch {
    ok = false;
  }
  pyProbeCache.at = Date.now();
  pyProbeCache.ok = ok;
  return ok;
}

export interface ChannelSnapshot extends Record<string, unknown> {
  via: "python-bridge" | "native";
}

export async function currentState(): Promise<ChannelSnapshot> {
  if (await pyBridgeOnline()) {
    try {
      const res = await fetch(`${PY_BRIDGE}/api/state`);
      if (res.ok) return { via: "python-bridge", ...(await res.json()) } as ChannelSnapshot;
    } catch {
      /* 落回原生 */
    }
  }
  return { via: "native", ...snapshot() };
}

export async function doAction(
  action: string,
  extra: Record<string, unknown> = {},
): Promise<ChannelSnapshot> {
  const py = await pyBridgeOnline();
  if (py) {
    const path = action === "qr-start" ? "/api/qr/start" : action === "fetch-start" ? "/api/fetch/start" : "/api/stop";
    try {
      const res = await fetch(`${PY_BRIDGE}${path}`, { method: "POST" });
      if (res.ok) return { via: "python-bridge", ...(await res.json()) } as ChannelSnapshot;
    } catch {
      /* 落回原生 */
    }
  }
  if (action === "cookie") {
    setCredentials(String(extra.p_skey ?? ""), String(extra.uin ?? ""));
  } else if (action === "qr-start") {
    startQr();
  } else if (action === "fetch-start") {
    startFetch();
  } else if (action === "stop") {
    stop();
  }
  return { via: "native", ...snapshot() };
}

export async function currentQrPng(): Promise<Uint8Array | null> {
  if (await pyBridgeOnline()) {
    try {
      const res = await fetch(`${PY_BRIDGE}/api/qr.png`);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch {
      /* 落回原生 */
    }
  }
  return qrPng();
}

export async function currentData(): Promise<{ msglist: unknown[]; meta: Record<string, unknown> } | null> {
  if (await pyBridgeOnline()) {
    try {
      const res = await fetch(`${PY_BRIDGE}/api/data`);
      if (res.ok) return (await res.json()) as { msglist: unknown[]; meta: Record<string, unknown> };
    } catch {
      /* 落回原生 */
    }
  }
  return dataPayload();
}

/** 二维码生成 + 登录轮询线程 */
export function startQr(): void {
  if (["qr", "confirm", "fetching"].includes(qzoneState.phase)) return;
  qzoneState.stopFlag = false;
  qzoneState.entries = [];
  qzoneState.total = null;
  qzoneState.pos = 0;
  qzoneState.cookies.clear();
  if (qzoneState.worker) return; // 上一个扫码线程还在跑
  setPhase("qr", "请用手机 QQ 扫描二维码");
  qzoneState.worker = (async () => {
    try {
      const newQr = async () => {
        const r = await httpsRequest(
          `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${APPID}&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}`,
          "https://xui.ptlogin2.qq.com/",
        );
        if (r.status !== 200 || r.body.subarray(0, 4).toString("binary") !== "\u0089PNG") {
          throw new Error("二维码获取失败（网关响应异常）");
        }
        qzoneState.qrPng = new Uint8Array(r.body);
        qzoneState.qrsig = qzoneState.cookies.get("qrsig") ?? "";
      };
      await newQr();
      while (!qzoneState.stopFlag) {
        const poll = await httpsRequest(
          `https://ssl.ptlogin2.qq.com/ptqrlogin?ptqrtoken=${hash33(qzoneState.qrsig)}` +
            `&redirect_uri=${encodeURIComponent("https://graph.qq.com/login_success.html")}` +
            `&from_ptlogin=1&u1=${encodeURIComponent("https://graph.qq.com/login_success.html")}` +
            `&pt_clientver=55032&pt_encoding=UTF-8&daid=1&appid=${APPID}`,
          `https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=${APPID}`,
        );
        const m = poll.body.toString("utf8").match(/ptuiCB\('(\d+)','0','([^']*)'/);
        if (!m) {
          setPhase("error", "登录响应无法解析，可能接口已变更");
          return;
        }
        const code = m[1];
        if (code === "66") {
          setPhase("qr", "等待扫码");
        } else if (code === "67") {
          setPhase("confirm", "已扫码，请在手机上确认");
        } else if (code === "65") {
          await newQr();
          setPhase("qr", "二维码已过期，已刷新");
        } else if (code === "0") {
          await httpsFollow(m[2], "https://xui.ptlogin2.qq.com/");
          const uin = (qzoneState.cookies.get("uin") ?? "").replace(/^o0?/, "");
          const pSkey = qzoneState.cookies.get("p_skey") ?? "";
          qzoneState.uin = uin;
          qzoneState.gtk = String(hash33(pSkey));
          setPhase("logged", `登录成功：QQ ${uin}`);
          return;
        } else {
          setPhase("error", `登录未完成（代码 ${code}），请重试`);
          return;
        }
        await sleep(1500);
      }
    } catch (exc) {
      setPhase("error", `登录异常：${exc instanceof Error ? exc.message : String(exc)}`);
    } finally {
      qzoneState.worker = null;
    }
  })();
}

/** 分页抓取说说（msglist 对 undici fetch 不拦，走原生 fetch + 内置限速，可随时停止） */
export function startFetch(): void {
  if (qzoneState.phase !== "logged") return;
  qzoneState.stopFlag = false;
  qzoneState.entries = [];
  qzoneState.total = null;
  qzoneState.pos = 0;
  setPhase("fetching", "开始抓取");
  const run = (async () => {
    try {
      const num = 20;
      let pos = 0;
      while (!qzoneState.stopFlag) {
        const res = await fetch(
          "https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6" +
            `?uin=${qzoneState.uin}&pos=${pos}&num=${num}&g_tk=${qzoneState.gtk}` +
            "&format=jsonp&callback=_cb&sort=0&get_comment=1&get_stat=1&code_version=1&inCharset=utf-8&outCharset=utf-8",
          {
            headers: {
              "User-Agent": UA,
              Referer: `https://user.qzone.qq.com/${qzoneState.uin}/infocenter`,
              Cookie: cookieHeader(),
            },
          },
        );
        const text = await res.text();
        const m = text.match(/_cb\((.*)\);?\s*$/s);
        if (!m) {
          setPhase("error", "接口响应无法解析（可能被风控），建议隔天再试");
          return;
        }
        const data = JSON.parse(m[1]) as { code?: number; msglist?: unknown[]; total?: number };
        if (data.code !== 0) {
          setPhase("error", `接口返回 code=${data.code}，登录态可能失效，请重新扫码`);
          return;
        }
        const msglist = data.msglist ?? [];
        qzoneState.entries.push(...msglist);
        if (typeof data.total === "number") qzoneState.total = data.total;
        qzoneState.pos = pos;
        if (!msglist.length || (typeof data.total === "number" && pos + num >= data.total)) break;
        pos += num;
        await sleep(2500 + Math.random() * 1500);
      }
      if (qzoneState.stopFlag) setPhase("idle", "已停止");
      else setPhase("done", `抓取完成，共 ${qzoneState.entries.length} 条`);
    } catch (exc) {
      setPhase("error", `抓取异常：${exc instanceof Error ? exc.message : String(exc)}`);
    }
  })();
  qzoneState.worker = run;
}

export function stop(): void {
  qzoneState.stopFlag = true;
  if (["qr", "confirm"].includes(qzoneState.phase)) setPhase("idle", "已停止扫码");
}

/**
 * Cookie 粘贴登录：浏览器登录 QQ 空间后复制 p_skey 与 uin（F12 → Application → Cookies）。
 * 这是 Node 后端下最可靠的登录态来源（ptlogin 扫码轮询有 TLS 指纹风控，实测 403）。
 */
export function setCredentials(pSkey: string, uin: string): boolean {
  const ps = pSkey.trim();
  const u = uin.trim().replace(/^o0?/, "");
  if (!ps || !/^\d{5,12}$/.test(u)) return false;
  qzoneState.stopFlag = false;
  qzoneState.cookies.clear();
  qzoneState.cookies.set("p_skey", ps);
  qzoneState.cookies.set("uin", `o${u}`);
  qzoneState.cookies.set("p_uin", `o${u}`);
  qzoneState.uin = u;
  qzoneState.gtk = String(hash33(ps));
  qzoneState.entries = [];
  qzoneState.total = null;
  qzoneState.pos = 0;
  setPhase("logged", `登录成功：QQ ${u}`);
  return true;
}

export function dataPayload(): { msglist: unknown[]; meta: { uin: string; count: number; source: string } } | null {
  if (qzoneState.phase !== "done") return null;
  return {
    msglist: qzoneState.entries,
    meta: { uin: qzoneState.uin, count: qzoneState.entries.length, source: "中庭原生通道" },
  };
}

export function qrPng(): Uint8Array | null {
  return qzoneState.qrPng;
}
