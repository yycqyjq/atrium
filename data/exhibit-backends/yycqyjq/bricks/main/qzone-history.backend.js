import m from "node:https";
const p = "549000912", d = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", q = globalThis, t = q.__atriumQzoneBridge ??= {
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
function r(o, e = "") {
  t.phase = o, t.message = e;
}
function g(o) {
  let e = 0;
  for (const n of o) e += (e << 5) + n.charCodeAt(0);
  return 2147483647 & e;
}
function _(o) {
  for (const e of o.headers["set-cookie"] ?? []) {
    const n = e.split(";")[0], s = n.indexOf("=");
    s > 0 && t.cookies.set(n.slice(0, s).trim(), n.slice(s + 1).trim());
  }
}
function f() {
  return [...t.cookies].map(([o, e]) => `${o}=${e}`).join("; ");
}
const A = new m.Agent({
  ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES256-GCM-SHA384",
  keepAlive: !0
});
function h(o, e) {
  return new Promise((n, s) => {
    const c = m.request(
      o,
      {
        method: "GET",
        agent: A,
        headers: {
          "User-Agent": d,
          Referer: e,
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9",
          ...f() ? { Cookie: f() } : {}
        }
      },
      (a) => {
        const i = [];
        a.on("data", (l) => i.push(l)), a.on("end", () => {
          _(a), n({ status: a.statusCode ?? 0, body: Buffer.concat(i), res: a });
        });
      }
    );
    c.on("error", s), c.end();
  });
}
async function S(o, e) {
  let n = o;
  for (let s = 0; s < 6; s++) {
    const { status: c, res: a } = await h(n, e);
    if (c < 300 || c >= 400) return;
    const i = a.headers.location;
    if (!i) return;
    n = new URL(i, n).toString();
  }
}
function k(o) {
  return new Promise((e) => setTimeout(e, o));
}
function C() {
  ["qr", "confirm", "fetching"].includes(t.phase) || (t.stopFlag = !1, t.entries = [], t.total = null, t.pos = 0, t.cookies.clear(), !t.worker && (r("qr", "请用手机 QQ 扫描二维码"), t.worker = (async () => {
    try {
      const o = async () => {
        const e = await h(
          `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${p}&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}`,
          "https://xui.ptlogin2.qq.com/"
        );
        if (e.status !== 200 || e.body.subarray(0, 4).toString("binary") !== "PNG")
          throw new Error("二维码获取失败（网关响应异常）");
        t.qrPng = new Uint8Array(e.body), t.qrsig = t.cookies.get("qrsig") ?? "";
      };
      for (await o(); !t.stopFlag; ) {
        const n = (await h(
          `https://ssl.ptlogin2.qq.com/ptqrlogin?ptqrtoken=${g(t.qrsig)}&redirect_uri=${encodeURIComponent("https://graph.qq.com/login_success.html")}&from_ptlogin=1&u1=${encodeURIComponent("https://graph.qq.com/login_success.html")}&pt_clientver=55032&pt_encoding=UTF-8&daid=1&appid=${p}`,
          `https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=${p}`
        )).body.toString("utf8").match(/ptuiCB\('(\d+)','0','([^']*)'/);
        if (!n) {
          r("error", "登录响应无法解析，可能接口已变更");
          return;
        }
        const s = n[1];
        if (s === "66")
          r("qr", "等待扫码");
        else if (s === "67")
          r("confirm", "已扫码，请在手机上确认");
        else if (s === "65")
          await o(), r("qr", "二维码已过期，已刷新");
        else if (s === "0") {
          await S(n[2], "https://xui.ptlogin2.qq.com/");
          const c = (t.cookies.get("uin") ?? "").replace(/^o0?/, ""), a = t.cookies.get("p_skey") ?? "";
          t.uin = c, t.gtk = String(g(a)), r("logged", `登录成功：QQ ${c}`);
          return;
        } else {
          r("error", `登录未完成（代码 ${s}），请重试`);
          return;
        }
        await k(1500);
      }
    } catch (o) {
      r("error", `登录异常：${o instanceof Error ? o.message : String(o)}`);
    } finally {
      t.worker = null;
    }
  })()));
}
function y() {
  if (t.phase !== "logged") return;
  t.stopFlag = !1, t.entries = [], t.total = null, t.pos = 0, r("fetching", "开始抓取");
  const o = (async () => {
    try {
      let n = 0;
      for (; !t.stopFlag; ) {
        const a = (await (await fetch(
          `https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?uin=${t.uin}&pos=${n}&num=20&g_tk=${t.gtk}&format=jsonp&callback=_cb&sort=0&get_comment=1&get_stat=1&code_version=1&inCharset=utf-8&outCharset=utf-8`,
          {
            headers: {
              "User-Agent": d,
              Referer: `https://user.qzone.qq.com/${t.uin}/infocenter`,
              Cookie: f()
            }
          }
        )).text()).match(/_cb\((.*)\);?\s*$/s);
        if (!a) {
          r("error", "接口响应无法解析（可能被风控），建议隔天再试");
          return;
        }
        const i = JSON.parse(a[1]);
        if (i.code !== 0) {
          r("error", `接口返回 code=${i.code}，登录态可能失效，请重新扫码`);
          return;
        }
        const l = i.msglist ?? [];
        if (t.entries.push(...l), typeof i.total == "number" && (t.total = i.total), t.pos = n, !l.length || typeof i.total == "number" && n + 20 >= i.total) break;
        n += 20, await k(2500 + Math.random() * 1500);
      }
      t.stopFlag ? r("idle", "已停止") : r("done", `抓取完成，共 ${t.entries.length} 条`);
    } catch (e) {
      r("error", `抓取异常：${e instanceof Error ? e.message : String(e)}`);
    }
  })();
  t.worker = o;
}
function w() {
  t.stopFlag = !0, ["qr", "confirm"].includes(t.phase) && r("idle", "已停止扫码");
}
function $(o, e) {
  const n = o.trim(), s = e.trim().replace(/^o0?/, "");
  return !n || !/^\d{5,12}$/.test(s) ? !1 : (t.stopFlag = !1, t.cookies.clear(), t.cookies.set("p_skey", n), t.cookies.set("uin", `o${s}`), t.cookies.set("p_uin", `o${s}`), t.uin = s, t.gtk = String(g(n)), t.entries = [], t.total = null, t.pos = 0, r("logged", `登录成功：QQ ${s}`), !0);
}
function E() {
  return t.phase !== "done" ? null : {
    msglist: t.entries,
    meta: { uin: t.uin, count: t.entries.length, source: "中庭原生通道" }
  };
}
function b() {
  return t.qrPng;
}
const P = {
  async handle(o) {
    if (o.method === "GET" && o.path === "state")
      return { json: u() };
    if (o.method === "GET" && o.path === "qr.png") {
      const e = b();
      return e ? { bytes: e, contentType: "image/png" } : { status: 404, json: { error: "尚未生成二维码" } };
    }
    if (o.method === "GET" && o.path === "data") {
      const e = E();
      return e ? { json: e } : { status: 409, json: { error: "尚未完成抓取" } };
    }
    if (o.method === "POST" && o.path === "action") {
      const e = o.body ?? {}, n = e.action ?? "";
      return n === "cookie" ? $(e.p_skey ?? "", e.uin ?? "") ? { json: u() } : { status: 400, json: { error: "p_skey 或 uin 格式不对" } } : n === "qr-start" ? (C(), { json: u() }) : n === "fetch-start" ? (y(), { json: u() }) : n === "stop" ? (w(), { json: u() }) : { status: 400, json: { error: "未知动作" } };
    }
    return { status: 404, json: { error: "not found" } };
  }
};
export {
  P as backend,
  E as dataPayload,
  b as qrPng,
  t as qzoneState,
  $ as setCredentials,
  u as snapshot,
  y as startFetch,
  C as startQr,
  w as stop
};
