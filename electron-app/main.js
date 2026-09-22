/**
 * 中庭 · Electron 壳（本地服务模式）
 *
 * - 拉起本地 Next standalone 服务（复用 scripts/start.mjs）
 * - 等待服务就绪后加载窗口
 * - ATRIUM_SMOKE=1：自检模式，隐藏窗口、加载完成后自动退出（退出码 0 = 通过）
 *
 * 运行前请先 `pnpm build`（需要 .next/standalone 产物）。
 * 证书由本进程自动注入：开发态读项目 certs/watt-toolkit.pem，打包态读 userData/certs/。
 *
 * 常用命令：
 *   pnpm desktop          # 打开中庭桌面窗口
 *   pnpm desktop:smoke    # 自检
 */
const { app, BrowserWindow, shell, Menu, dialog, net } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const IS_PACKAGED = app.isPackaged;
const PORT = Number(process.env.ATRIUM_PORT || 3299);
const SMOKE = process.env.ATRIUM_SMOKE === "1";
const READY_TIMEOUT_MS = 30000;
/** 安装包存档所在的应用仓库（GitHub Releases） */
const APP_REPO = "yycqyjq/atrium";

// 收集系统信任的证书（macOS：钥匙串全量导出；Windows：本机+用户根证书导出为 PEM）。
// 任何代理工具「一键安装证书到系统」后都会进入这里——应用自动跟随，无需手动配置。
function collectSystemCerts() {
  try {
    if (process.platform === "darwin") {
      return execFileSync("/usr/bin/security", ["find-certificate", "-a", "-p"], {
        encoding: "utf8",
        timeout: 15000,
        maxBuffer: 32 * 1024 * 1024,
      });
    }
    if (process.platform === "win32") {
      const ps =
        "$ErrorActionPreference='SilentlyContinue'; Get-ChildItem Cert:\\LocalMachine\\Root, Cert:\\CurrentUser\\Root | ForEach-Object { '-----BEGIN CERTIFICATE-----'; [System.Convert]::ToBase64String($_.RawData, [System.Base64FormattingOptions]::InsertLineBreaks); '-----END CERTIFICATE-----' }";
      return execFileSync("powershell", ["-NoProfile", "-Command", ps], {
        encoding: "utf8",
        timeout: 30000,
        maxBuffer: 32 * 1024 * 1024,
      });
    }
  } catch (err) {
    console.warn("[electron] 系统证书导出失败（忽略）:", err?.message ?? err);
  }
  return "";
}

/** 手动放置的 pem + 系统信任证书 → 合并成一个 CA bundle（供 NODE_EXTRA_CA_CERTS 使用） */
function buildCaBundle() {
  const parts = [];
  try {
    const dir = app.isPackaged
      ? path.join(app.getPath("userData"), "certs")
      : path.join(ROOT, "certs");
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (/\.pem$/i.test(f) && !f.startsWith("_")) {
          const content = fs.readFileSync(path.join(dir, f), "utf8");
          if (content.includes("BEGIN CERTIFICATE")) parts.push(content);
        }
      }
    }
  } catch (err) {
    console.warn("[electron] 手动证书读取失败（忽略）:", err?.message ?? err);
  }
  const sys = collectSystemCerts();
  if (sys.includes("BEGIN CERTIFICATE")) parts.push(sys);
  if (parts.length === 0) return "";
  const bundle = path.join(app.getPath("userData"), "certs", "_ca-bundle.pem");
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  fs.writeFileSync(bundle, parts.join("\n"));
  return bundle;
}

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

    // 证书：显式指定优先；否则自动合并「手动放置的 pem + 系统信任的证书」。
    // 系统信任的导出让任何代理工具「一键安装证书到系统」后都自动生效——无需手动放置文件。
    if (env.NODE_EXTRA_CA_CERTS && !path.isAbsolute(env.NODE_EXTRA_CA_CERTS)) {
      env.NODE_EXTRA_CA_CERTS = path.resolve(plan.cwd, env.NODE_EXTRA_CA_CERTS);
    }
    if (!env.NODE_EXTRA_CA_CERTS) {
      const bundle = buildCaBundle();
      if (bundle) env.NODE_EXTRA_CA_CERTS = bundle;
    }

    // 数据目录：开发=项目 data/；打包=系统 userData（应用包保持只读）
    env.ATRIUM_DATA_DIR =
      env.ATRIUM_DATA_DIR ||
      (IS_PACKAGED ? path.join(app.getPath("userData"), "data") : path.join(ROOT, "data"));
      env.ATRIUM_ALLOW_WRITE = env.ATRIUM_ALLOW_WRITE || "1"; // 桌面端开放写作

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

/** 语义化版本比较：a > b 返回 1，相等 0，小于 -1 */
function compareVersions(a, b) {
  const pa = String(a).split(".").map((n) => Number(n) || 0);
  const pb = String(b).split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * 更新检测：查 Releases latest，比本机版本新则弹窗引导去下载页。
 * 未签名 mac 做不到静默自更，这里只做提示；interactive=false 为启动后台检查，失败静默。
 */
async function checkForUpdate(interactive) {
  try {
    const res = await Promise.race([
      net.fetch(`https://api.github.com/repos/${APP_REPO}/releases/latest`, {
        headers: { "User-Agent": "atrium-desktop", Accept: "application/vnd.github+json" },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("查询超时")), 10000)),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const release = (await res.json());
    const latest = String(release.tag_name || "").replace(/^v/, "");
    const current = app.getVersion();
    if (!latest || compareVersions(latest, current) <= 0) {
      if (interactive) {
        await dialog.showMessageBox(win ?? undefined, {
          type: "info",
          title: "中庭",
          message: `已是最新版本 v${current}`,
          buttons: ["好"],
        });
      }
      return;
    }
    const { response } = await dialog.showMessageBox(win ?? undefined, {
      type: "info",
      title: "发现新版本",
      message: `中庭 v${latest} 已发布（当前 v${current}）`,
      detail: "可到发布页下载最新安装包，安装后数据自动保留。",
      buttons: ["前往下载", "以后再说"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0 && release.html_url) shell.openExternal(release.html_url);
  } catch (err) {
    if (interactive) {
      await dialog.showMessageBox(win ?? undefined, {
        type: "warning",
        title: "中庭",
        message: "检查更新失败，请稍后再试",
        detail: err instanceof Error ? err.message : String(err),
        buttons: ["好"],
      });
    } else {
      console.warn("[electron] 更新检查失败（静默）：", err instanceof Error ? err.message : err);
    }
  }
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

/** 应用菜单：中文语义 + 常用快捷键（Cmd+N 写作台、Cmd+1..4 切房间） */
function buildMenu() {
  const template = [
    {
      label: "中庭",
      submenu: [
        { label: "关于中庭", role: "about" },
        { label: "检查更新…", click: () => checkForUpdate(true) },
        { type: "separator" },
        { label: "隐藏中庭", role: "hide" },
        { label: "隐藏其他", role: "hideOthers" },
        { label: "显示全部", role: "unhide" },
        { type: "separator" },
        { label: "退出中庭", role: "quit" },
      ],
    },
    {
      label: "房间",
      submenu: [
        { label: "中庭（首页）", accelerator: "Cmd+1", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/`) },
        { label: "书房", accelerator: "Cmd+2", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/study`) },
        { label: "画廊", accelerator: "Cmd+3", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/gallery`) },
        { label: "工具房", accelerator: "Cmd+4", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/tools`) },
        { label: "陈列廊", accelerator: "Cmd+5", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/atelier`) },
      ],
    },
    {
      label: "写作",
      submenu: [
        { label: "新文章（写作台）", accelerator: "CmdOrCtrl+N", click: () => win?.webContents.loadURL(`http://127.0.0.1:${PORT}/study/write`) },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { label: "撤销", role: "undo" },
        { label: "重做", role: "redo" },
        { type: "separator" },
        { label: "剪切", role: "cut" },
        { label: "拷贝", role: "copy" },
        { label: "粘贴", role: "paste" },
        { label: "全选", role: "selectAll" },
      ],
    },
    {
      label: "窗口",
      submenu: [{ label: "最小化", role: "minimize" }, { label: "关闭窗口", role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  try {
    console.log(`[electron] 启动本地服务（端口 ${PORT}）…`);
    await startServer();
    console.log("[electron] 本地服务就绪，创建窗口");
    await createWindow();
    buildMenu();
    console.log("[electron] 页面加载完成：", win.webContents.getURL());

    // 打包版启动后静默查一次更新（3 秒后，避开首屏资源竞争；失败不打扰）
    if (IS_PACKAGED && !SMOKE) {
      setTimeout(() => checkForUpdate(false), 3000);
    }

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
