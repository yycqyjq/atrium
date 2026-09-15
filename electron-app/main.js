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
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const IS_PACKAGED = app.isPackaged;
const PORT = Number(process.env.ATRIUM_PORT || 3299);
const SMOKE = process.env.ATRIUM_SMOKE === "1";
const READY_TIMEOUT_MS = 30000;

let serverProc = null;
let win = null;

/** 打包版：把内置服务包解压到 userData（首次运行或版本更新时），返回服务根目录 */
function ensurePackagedServer() {
  const base = path.join(app.getPath("userData"), "server");
  const marker = path.join(base, ".version");
  const source = path.join(process.resourcesPath, "server.tar.gz");
  const upToDate =
    fs.existsSync(path.join(base, "server.js")) &&
    fs.existsSync(marker) &&
    fs.readFileSync(marker, "utf8").trim() === app.getVersion();

  if (!upToDate) {
    fs.mkdirSync(base, { recursive: true });
    console.log("[electron] 解压内置服务到", base);
    const result = spawnSync("tar", ["-xzf", source, "-C", base], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("解压内置服务失败");
    fs.writeFileSync(marker, app.getVersion());
  }
  return base;
}

/** 服务入口与工作目录：开发=项目根（走 start.mjs）；打包=userData/server（直接起 standalone） */
function serverPlan() {
  if (IS_PACKAGED) {
    const serverRoot = ensurePackagedServer();
    return { serverRoot, entry: path.join(serverRoot, "server.js"), cwd: serverRoot };
  }
  return {
    serverRoot: ROOT,
    entry: path.join(ROOT, "scripts", "start.mjs"),
    cwd: ROOT,
  };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const plan = serverPlan();
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
    };

    // 证书：相对路径转绝对；打包版支持从 userData/certs/watt-toolkit.pem 自动注入
    if (env.NODE_EXTRA_CA_CERTS && !path.isAbsolute(env.NODE_EXTRA_CA_CERTS)) {
      env.NODE_EXTRA_CA_CERTS = path.resolve(plan.cwd, env.NODE_EXTRA_CA_CERTS);
    }
    if (!env.NODE_EXTRA_CA_CERTS && IS_PACKAGED) {
      const userCert = path.join(app.getPath("userData"), "certs", "watt-toolkit.pem");
      if (fs.existsSync(userCert)) env.NODE_EXTRA_CA_CERTS = userCert;
    }

    // 数据目录：开发=项目 data/；打包=系统 userData（应用包保持只读）
    env.ATRIUM_DATA_DIR =
      env.ATRIUM_DATA_DIR ||
      (IS_PACKAGED ? path.join(app.getPath("userData"), "data") : path.join(ROOT, "data"));

    serverProc = spawn(process.execPath, [plan.entry], {
      cwd: plan.cwd,
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

    // 调试/自检用：将窗口实际渲染结果保存为截图（先等入场动画结束）
    const shotPath = process.env.ATRIUM_SHOT_PATH;
    if (shotPath) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const image = await win.webContents.capturePage();
      fs.writeFileSync(shotPath, image.toPNG());
      console.log("[electron] 窗口截图已保存：", shotPath);
    }

    if (SMOKE) {
      console.log("[electron] ✅ SMOKE 自检通过");
      process.exitCode = 0;
      app.quit();
    }
  } catch (err) {
    console.error("[electron] ❌ 启动失败：", err);
    if (serverProc && serverProc.exitCode === null) serverProc.kill("SIGTERM");
    app.exit(1);
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
