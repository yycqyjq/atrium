#!/usr/bin/env python3
"""QQ空间回忆馆 · 本地桥接

扫码登录 QQ（官方 ptlogin 二维码），分页抓取空间说说（含图片与评论，限速），
供 bricks「QQ空间回忆馆」展品在本机拉取。

只监听 127.0.0.1，数据不出本机。抓取走官方接口、内置限速，请勿在高峰期长时间抓取。

用法:
    pip install requests
    python3 bridge.py            # 默认端口 18772
    python3 bridge.py 18800      # 自定义端口

接口:
    GET  /api/state     当前状态（phase / 进度 / 提示）
    GET  /api/qr.png    登录二维码
    POST /api/qr/start  生成二维码开始扫码流程
    POST /api/fetch/start  开始抓取说说
    POST /api/stop      停止当前动作
    GET  /api/data      抓取结果（msglist 原始结构，展品可直接导入）
"""

from __future__ import annotations

import json
import random
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    from curl_cffi import requests as rq  # 模拟真实浏览器 TLS 指纹，绕过 ptlogin 的 JA3 风控
    IMPERSONATE = "chrome"
except ImportError:
    import requests as rq
    IMPERSONATE = None

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 18772
APPID = "549000912"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
}


def _get(session, url, **kw):
    if IMPERSONATE:
        kw.setdefault("impersonate", IMPERSONATE)
    return session.get(url, **kw)


def hash33(s: str) -> int:
    """ptqrtoken / g_tk 共用的 hash33 算法（社区公开常识）。"""
    e = 0
    for c in s:
        e += (e << 5) + ord(c)
    return 2147483647 & e


class Bridge:
    """扫码 → 登录 → 抓取的状态机。线程安全（一把大锁，量级足够）。"""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.phase = "idle"  # idle/qr/scan/confirm/logged/fetching/done/error
        self.message = ""
        self.qr_png: bytes | None = None
        self.session: rq.Session | None = None
        self.qrsig = ""
        self.uin = ""
        self.gtk = ""
        self.entries: list = []
        self.total: int | None = None
        self.pos = 0
        self.worker: threading.Thread | None = None
        self.stop_flag = threading.Event()

    def snapshot(self) -> dict:
        with self.lock:
            return {
                "phase": self.phase,
                "message": self.message,
                "uin": self.uin,
                "pos": self.pos,
                "total": self.total,
                "count": len(self.entries),
            }

    def set(self, phase: str, message: str = "") -> None:
        with self.lock:
            self.phase = phase
            self.message = message

    # ---------- 扫码 ----------

    def start_qr(self) -> None:
        with self.lock:
            if self.phase in ("qr", "scan", "confirm", "fetching"):
                return
            self.stop_flag.clear()
            self.entries = []
            self.total = None
            self.pos = 0
            self.session = rq.Session()
            self.session.headers["User-Agent"] = UA
        self.new_qr()
        self.set("qr", "请用手机 QQ 扫描二维码")
        t = threading.Thread(target=self.poll_login, daemon=True)
        t.start()

    def new_qr(self) -> None:
        r = _get(
            self.session,
            "https://ssl.ptlogin2.qq.com/ptqrshow",
            params={"appid": APPID, "e": "2", "l": "M", "s": "3", "d": "72", "v": "4", "t": str(random.random())},
            timeout=15,
        )
        r.raise_for_status()
        with self.lock:
            self.qr_png = r.content
            self.qrsig = self.session.cookies.get("qrsig", domain="ptlogin2.qq.com") or ""

    def poll_login(self) -> None:
        """轮询二维码状态：66 未扫 / 67 已扫待确认 / 65 过期 / 0 成功。"""
        while not self.stop_flag.is_set():
            try:
                r = _get(
                    self.session,
                    "https://ssl.ptlogin2.qq.com/ptqrlogin",
                    params={
                        "ptqrtoken": hash33(self.qrsig),
                        "redirect_uri": "https://graph.qq.com/login_success.html",
                        "from_ptlogin": "1",
                        "u1": "https://graph.qq.com/login_success.html",
                        "pt_clientver": "55032",
                        "pt_encoding": "UTF-8",
                        "daid": "1",
                        "appid": APPID,
                    },
                    headers={"Referer": "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=" + APPID},
                    timeout=15,
                )
                m = re.search(r"ptuiCB\('(\d+)','0','([^']*)'", r.text)
                if not m:
                    snippet = r.text.strip()[:120] or f"(空响应 HTTP {r.status_code})"
                    self.set("error", f"登录响应无法解析：{snippet}")
                    return
                code, redirect = m.group(1), m.group(2)
                if code == "66":
                    self.set("qr", "等待扫码")
                elif code == "67":
                    self.set("confirm", "已扫码，请在手机上确认")
                elif code == "65":
                    self.new_qr()
                    self.set("qr", "二维码已过期，已刷新")
                elif code == "0":
                    # check_sig 跳转，成功后票据 Cookie 落进会话
                    _get(self.session, redirect, headers={"Referer": "https://xui.ptlogin2.qq.com/"}, timeout=15)
                    uin = self.session.cookies.get("uin") or ""
                    uin = uin.lstrip("o0")
                    if not uin:
                        m2 = re.search(r"[?&]uin=(\d+)", redirect)
                        uin = m2.group(1) if m2 else ""
                    p_skey = self.session.cookies.get("p_skey") or ""
                    with self.lock:
                        self.uin = uin
                        self.gtk = str(hash33(p_skey))
                    self.set("logged", f"登录成功：QQ {uin}")
                    return
                else:
                    self.set("error", f"登录未完成（代码 {code}），请重试")
                    return
            except Exception as exc:  # noqa: BLE001
                self.set("error", f"登录轮询异常：{exc}")
                return
            time.sleep(1.5)

    # ---------- 抓取 ----------

    def start_fetch(self) -> None:
        with self.lock:
            if self.phase != "logged":
                return
            self.stop_flag.clear()
            self.entries = []
            self.total = None
            self.pos = 0
        self.set("fetching", "开始抓取")
        t = threading.Thread(target=self.fetch_all, daemon=True)
        t.start()

    def fetch_all(self) -> None:
        session = self.session
        num = 20
        pos = 0
        try:
            while not self.stop_flag.is_set():
                r = _get(
                    session,
                    "https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6",
                    params={
                        "uin": self.uin,
                        "pos": pos,
                        "num": num,
                        "g_tk": self.gtk,
                        "format": "jsonp",
                        "callback": "_cb",
                        "sort": "0",
                        "get_comment": "1",
                        "get_stat": "1",
                        "code_version": "1",
                        "inCharset": "utf-8",
                        "outCharset": "utf-8",
                    },
                    headers={"Referer": f"https://user.qzone.qq.com/{self.uin}/infocenter"},
                    timeout=20,
                )
                m = re.search(r"_cb\((.*)\);?\s*$", r.text, re.S)
                if not m:
                    self.set("error", "接口响应无法解析（可能被风控），建议隔天再试")
                    return
                data = json.loads(m.group(1))
                if data.get("code") != 0:
                    self.set("error", f"接口返回 code={data.get('code')}，登录态可能失效，请重新扫码")
                    return
                msglist = data.get("msglist") or []
                total = data.get("total")
                with self.lock:
                    self.entries.extend(msglist)
                    self.total = total if isinstance(total, int) else self.total
                    self.pos = pos
                if not msglist or (isinstance(total, int) and pos + num >= total):
                    break
                pos += num
                # 内置限速：慢速分页 + 抖动，别给服务器添堵
                time.sleep(2.5 + random.random() * 1.5)
            with self.lock:
                if self.stop_flag.is_set():
                    self.phase = "idle"
                    self.message = "已停止"
                else:
                    self.phase = "done"
                    self.message = f"抓取完成，共 {len(self.entries)} 条"
        except Exception as exc:  # noqa: BLE001
            self.set("error", f"抓取异常：{exc}")

    def stop(self) -> None:
        self.stop_flag.set()
        if self.phase in ("qr", "scan", "confirm"):
            self.set("idle", "已停止扫码")


STATE = Bridge()


class Handler(BaseHTTPRequestHandler):
    def _send(self, payload, status: int = 200, ctype: str = "application/json; charset=utf-8") -> None:
        body = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(b"", 204, "text/plain")

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?")[0]
        if path == "/api/state":
            self._send(STATE.snapshot())
        elif path == "/api/qr.png":
            with STATE.lock:
                png = STATE.qr_png
            if png:
                self._send(png, 200, "image/png")
            else:
                self._send({"error": "尚未生成二维码"}, 404)
        elif path == "/api/data":
            with STATE.lock:
                if STATE.phase != "done":
                    self._send({"error": "尚未完成抓取"}, 409)
                    return
                payload = {
                    "msglist": STATE.entries,
                    "meta": {"uin": STATE.uin, "count": len(STATE.entries), "source": "本机桥接"},
                }
            self._send(payload)
        else:
            self._send({"error": "not found"}, 404)

    def do_POST(self) -> None:  # noqa: N802
        self._body()
        path = self.path.split("?")[0]
        if path == "/api/qr/start":
            STATE.start_qr()
            self._send(STATE.snapshot())
        elif path == "/api/fetch/start":
            STATE.start_fetch()
            self._send(STATE.snapshot())
        elif path == "/api/stop":
            STATE.stop()
            self._send(STATE.snapshot())
        else:
            self._send({"error": "not found"}, 404)

    def log_message(self, fmt: str, *args) -> None:  # 静默默认访问日志
        pass


if __name__ == "__main__":
    print(f"QQ空间回忆馆 · 本地桥接已启动：http://127.0.0.1:{PORT}  （仅本机可访问，Ctrl+C 退出）")
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n已退出")
