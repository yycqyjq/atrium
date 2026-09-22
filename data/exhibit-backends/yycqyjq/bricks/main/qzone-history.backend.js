import { spawn as A } from "node:child_process";
import { existsSync as _, chmodSync as C } from "node:fs";
import { join as S } from "node:path";
import b from "node:https";
const h = "549000912", $ = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", P = globalThis, t = P.__atriumQzoneBridge ??= {
  phase: "idle",
  message: "",
  qrPng: null,
  qrsig: "",
  cookies: /* @__PURE__ */ new Map(),
  uin: "",
  gtk: "",
  entries: [],
  total: null,
  pos: 0,
  stopFlag: !1,
  worker: null
};
function u() {
  return {
    phase: t.phase,
    message: t.message,
    uin: t.uin,
    pos: t.pos,
    total: t.total,
    count: t.entries.length
  };
}
function s(e, n = "") {
  t.phase = e, t.message = n;
}
function d(e) {
  let n = 0;
  for (const o of e) n += (n << 5) + o.charCodeAt(0);
  return 2147483647 & n;
}
function E(e) {
  for (const n of e.headers["set-cookie"] ?? []) {
    const o = n.split(";")[0], r = o.indexOf("=");
    r > 0 && t.cookies.set(o.slice(0, r).trim(), o.slice(r + 1).trim());
  }
}
function m() {
  return [...t.cookies].map(([e, n]) => `${e}=${n}`).join("; ");
}
const j = new b.Agent({
  ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES256-GCM-SHA384",
  keepAlive: !0
});
function y(e, n) {
  return new Promise((o, r) => {
    const c = b.request(
      e,
      {
        method: "GET",
        agent: j,
        headers: {
          "User-Agent": $,
          Referer: n,
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9",
          ...m() ? { Cookie: m() } : {}
        }
      },
      (a) => {
        const i = [];
        a.on("data", (l) => i.push(l)), a.on("end", () => {
          E(a), o({ status: a.statusCode ?? 0, body: Buffer.concat(i), res: a });
        });
      }
    );
    c.on("error", r), c.end();
  });
}
async function T(e, n) {
  let o = e;
  for (let r = 0; r < 6; r++) {
    const { status: c, res: a } = await y(o, n);
    if (c < 300 || c >= 400) return;
    const i = a.headers.location;
    if (!i) return;
    o = new URL(i, o).toString();
  }
}
function k(e) {
  return new Promise((n) => setTimeout(n, e));
}
function v() {
  ["qr", "confirm", "fetching"].includes(t.phase) || (t.stopFlag = !1, t.entries = [], t.total = null, t.pos = 0, t.cookies.clear(), !t.worker && (s("qr", "请用手机 QQ 扫描二维码"), t.worker = (async () => {
    try {
      const e = async () => {
        const n = await y(
          `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${h}&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}`,
          "https://xui.ptlogin2.qq.com/"
        );
        if (n.status !== 200 || n.body.subarray(0, 4).toString("binary") !== "PNG")
          throw new Error("二维码获取失败（网关响应异常）");
        t.qrPng = new Uint8Array(n.body), t.qrsig = t.cookies.get("qrsig") ?? "";
      };
      for (await e(); !t.stopFlag; ) {
        const o = (await y(
          `https://ssl.ptlogin2.qq.com/ptqrlogin?ptqrtoken=${d(t.qrsig)}&redirect_uri=${encodeURIComponent("https://graph.qq.com/login_success.html")}&from_ptlogin=1&u1=${encodeURIComponent("https://graph.qq.com/login_success.html")}&pt_clientver=55032&pt_encoding=UTF-8&daid=1&appid=${h}`,
          `https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=${h}`
        )).body.toString("utf8").match(/ptuiCB\('(\d+)','0','([^']*)'/);
        if (!o) {
          s("error", "登录响应无法解析，可能接口已变更");
          return;
        }
        const r = o[1];
        if (r === "66")
          s("qr", "等待扫码");
        else if (r === "67")
          s("confirm", "已扫码，请在手机上确认");
        else if (r === "65")
          await e(), s("qr", "二维码已过期，已刷新");
        else if (r === "0") {
          await T(o[2], "https://xui.ptlogin2.qq.com/");
          const c = (t.cookies.get("uin") ?? "").replace(/^o0?/, ""), a = t.cookies.get("p_skey") ?? "";
          t.uin = c, t.gtk = String(d(a)), s("logged", `登录成功：QQ ${c}`);
          return;
        } else {
          s("error", `登录未完成（代码 ${r}），请重试`);
          return;
        }
        await k(1500);
      }
    } catch (e) {
      s("error", `登录异常：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      t.worker = null;
    }
  })()));
}
function H() {
  if (t.phase !== "logged") return;
  t.stopFlag = !1, t.entries = [], t.total = null, t.pos = 0, s("fetching", "开始抓取");
  const e = (async () => {
    try {
      let o = 0;
      for (; !t.stopFlag; ) {
        const a = (await (await fetch(
          `https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?uin=${t.uin}&pos=${o}&num=20&g_tk=${t.gtk}&format=jsonp&callback=_cb&sort=0&get_comment=1&get_stat=1&code_version=1&inCharset=utf-8&outCharset=utf-8`,
          {
            headers: {
              "User-Agent": $,
              Referer: `https://user.qzone.qq.com/${t.uin}/infocenter`,
              Cookie: m()
            }
          }
        )).text()).match(/_cb\((.*)\);?\s*$/s);
        if (!a) {
          s("error", "接口响应无法解析（可能被风控），建议隔天再试");
          return;
        }
        const i = JSON.parse(a[1]);
        if (i.code !== 0) {
          s("error", `接口返回 code=${i.code}，登录态可能失效，请重新扫码`);
          return;
        }
        const l = i.msglist ?? [];
        if (t.entries.push(...l), typeof i.total == "number" && (t.total = i.total), t.pos = o, !l.length || typeof i.total == "number" && o + 20 >= i.total) break;
        o += 20, await k(2500 + Math.random() * 1500);
      }
      t.stopFlag ? s("idle", "已停止") : s("done", `抓取完成，共 ${t.entries.length} 条`);
    } catch (n) {
      s("error", `抓取异常：${n instanceof Error ? n.message : String(n)}`);
    }
  })();
  t.worker = e;
}
function x() {
  t.stopFlag = !0, ["qr", "confirm"].includes(t.phase) && s("idle", "已停止扫码");
}
function D(e, n) {
  const o = e.trim(), r = n.trim().replace(/^o0?/, "");
  return !o || !/^\d{5,12}$/.test(r) ? !1 : (t.stopFlag = !1, t.cookies.clear(), t.cookies.set("p_skey", o), t.cookies.set("uin", `o${r}`), t.cookies.set("p_uin", `o${r}`), t.uin = r, t.gtk = String(d(o)), t.entries = [], t.total = null, t.pos = 0, s("logged", `登录成功：QQ ${r}`), !0);
}
function M() {
  return t.phase !== "done" ? null : {
    msglist: t.entries,
    meta: { uin: t.uin, count: t.entries.length, source: "中庭原生通道" }
  };
}
function R() {
  return t.qrPng;
}
const q = 18772, p = `http://127.0.0.1:${q}`;
function G() {
  return process.platform === "win32" ? "bridge-windows.exe" : process.platform === "darwin" ? "bridge-macos" : "bridge-linux";
}
const f = { at: 0, ok: !1 };
async function w() {
  if (Date.now() - f.at < 3e3) return f.ok;
  let e = !1;
  try {
    e = (await fetch(`${p}/api/state`, { signal: AbortSignal.timeout(800) })).ok;
  } catch {
    e = !1;
  }
  return f.at = Date.now(), f.ok = e, e;
}
function F() {
  const e = [];
  process.env.ATRIUM_PY_BRIDGE_CMD && e.push(process.env.ATRIUM_PY_BRIDGE_CMD);
  const n = process.env.ATRIUM_DATA_DIR || S(process.cwd(), "data");
  return e.push(S(n, "bridge", G())), e;
}
let g = "";
async function O() {
  if (await w()) return !0;
  const e = F(), n = [];
  g = `cwd=${process.cwd()} 候选=${e.join("、") || "(空)"}`;
  for (const o of e)
    if (n.push(`${o}(${_(o) ? "有" : "无"})`), !!_(o)) {
      try {
        if (process.platform !== "win32")
          try {
            C(o, 493), A("xattr", ["-d", "com.apple.quarantine", o], { stdio: "ignore" }).unref?.();
          } catch {
          }
        A(o, [String(q)], { detached: !0, stdio: "ignore" }).unref();
      } catch {
        continue;
      }
      for (let r = 0; r < 24; r++) {
        if (await k(750), await w()) return !0;
        if (t.stopFlag) return !1;
      }
      g = `未能上线：${o}`;
    }
  return g = n.join("、") || "(候选列表为空)", !1;
}
async function U(e) {
  if (e.path === "action" && e.method === "POST") {
    const o = e.body?.action ?? "";
    return { json: { ...await (await fetch(`${p}${o === "qr-start" ? "/api/qr/start" : o === "fetch-start" ? "/api/fetch/start" : "/api/stop"}`, { method: "POST", signal: AbortSignal.timeout(3e4) })).json(), via: "python-bridge" } };
  }
  if (e.path === "qr.png") {
    const o = await fetch(`${p}/api/qr.png`, { signal: AbortSignal.timeout(1e4) });
    return o.ok ? { bytes: new Uint8Array(await o.arrayBuffer()), contentType: "image/png" } : { status: o.status, json: { error: "尚未生成二维码" } };
  }
  return { json: { ...await (await fetch(`${p}/api/${e.path}`, { signal: AbortSignal.timeout(1e4) })).json(), via: "python-bridge" } };
}
const z = {
  async handle(e) {
    if (await w())
      return e.path === "action" && e.body?.action === "cookie" ? { status: 400, json: { error: "Python 桥模式请使用扫码登录" } } : U(e);
    if (e.method === "GET" && e.path === "state")
      return { json: { ...u(), via: "native" } };
    if (e.method === "GET" && e.path === "qr.png") {
      const n = R();
      return n ? { bytes: n, contentType: "image/png" } : { status: 404, json: { error: "尚未生成二维码" } };
    }
    if (e.method === "GET" && e.path === "data") {
      const n = M();
      return n ? { json: n } : { status: 409, json: { error: "尚未完成抓取" } };
    }
    if (e.method === "POST" && e.path === "action") {
      const n = e.body ?? {}, o = n.action ?? "";
      return o === "cookie" ? D(n.p_skey ?? "", n.uin ?? "") ? { json: { ...u(), via: "native" } } : { status: 400, json: { error: "p_skey 或 uin 格式不对" } } : o === "qr-start" ? await O() ? { json: { ...await (await fetch(`${p}/api/qr/start`, { method: "POST", signal: AbortSignal.timeout(3e4) })).json(), via: "python-bridge" } } : (v(), { json: { ...u(), via: "native", message: `Python 桥不可用（${g || "未尝试"}），已回退 Node 直连扫码` } }) : o === "fetch-start" ? (H(), { json: { ...u(), via: "native" } }) : o === "stop" ? (x(), { json: { ...u(), via: "native" } }) : { status: 400, json: { error: "未知动作" } };
    }
    return { status: 404, json: { error: "not found" } };
  }
};
export {
  z as backend,
  M as dataPayload,
  R as qrPng,
  t as qzoneState,
  D as setCredentials,
  u as snapshot,
  H as startFetch,
  v as startQr,
  x as stop
};
