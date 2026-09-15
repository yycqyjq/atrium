/**
 * 中庭 · Electron 壳（本地服务模式）
 *
 * - 拉起本地 Next standalone 服务（复用 scripts/start.mjs）
 * - 等待服务就绪后加载窗口
 * - ATRIUM_SMOKE=1：自检模式，隐藏窗口、加载完成后自动退出（退出码 0 = 通过）
 *
 * 运行前请先 `pnpm build`（需要 .next/standalone 产物）。
 * 常用命令：
 *   pnpm desktop          # 打开中庭桌面窗口
 *   pnpm desktop:cert     # 本机（含 Watt Toolkit 证书的启动方式）
 *   pnpm desktop:smoke    # 自检
 */
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.ATRIUM_PORT || 3299);
const SMOKE = process.env.ATRIUM_SMOKE === "1";
const READY_TIMEOUT_MS = 30000;

let serverProc = null;
let win = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
    };
    // 相对证书路径转绝对（standalone server 会 chdir）
    if (env.NODE_EXTRA_CA_CERTS && !path.isAbsolute(env.NODE_EXTRA_CA_CERTS)) {
      env.NODE_EXTRA_CA_CERTS = path.resolve(ROOT, env.NODE_EXTRA_CA_CERTS);
    }
    env.ATRIUM_DATA_DIR = env.ATRIUM_DATA_DIR || path.join(ROOT, "data");

    serverProc = spawn(process.execPath, [path.join(ROOT, "scripts", "start.mjs")], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "inherit", "inherit"],
    });

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (serverProc.exitCode !== null) {
        clearInterval(timer);
        reject(new Error(`本地服务进程退出（code=${serverProc.exitCode}）`));
        return;
      }
      if (Date.now() - startedAt > READY_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error("本地服务启动超时"));
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/`);
        if (res.ok) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        /* 还没就绪，继续等 */
      }
    }, 400);
  });
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: "#f6f4ee",
    title: "中庭",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once("ready-to-show", () => {
    if (!SMOKE) win.show();
  });

  // 外部链接交给系统浏览器；站内跳转走同一窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  await win.loadURL(`http://127.0.0.1:${PORT}/`);
}

app.whenReady().then(async () => {
  try {
    console.log(`[electron] 启动本地服务（端口 ${PORT}）…`);
    await startServer();
    console.log("[electron] 本地服务就绪，创建窗口");
    await createWindow();
    console.log("[electron] 页面加载完成：", win.webContents.getURL());
    if (SMOKE) {
      console.log("[electron] ✅ SMOKE 自检通过");
      process.exitCode = 0;
      app.quit();
    }
  } catch (err) {
    console.error("[electron] ❌ 启动失败：", err);
    process.exitCode = 1;
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (serverProc && serverProc.exitCode === null) {
    serverProc.kill("SIGTERM");
  }
});
