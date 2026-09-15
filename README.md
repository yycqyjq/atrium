# 中庭 Atrium

个人数字空间「中庭」：一个中心，四间房。全栈 Next.js 实现。

- **中庭**：个人主页，身份、房间入口与最近动态
- **书房**：文章与长文（读）
- **画廊**：照片与影像（看）
- **工具房**：书签与常用工具（用）
- **陈列廊**：组件与实验（造）

`design/` 目录是重构前期的静态方向样板（视觉基准）；本工程是它落地到真实代码的实现。

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19，全栈一体（原 Koa 后端的职责由 Route Handlers 承接）
- **样式**：Tailwind CSS v4（`src/app/globals.css` 中的 `@theme` 定义了全部设计 tokens）
- **语言**：TypeScript（严格模式）
- **桌面端**：Electron 壳内启动本地 Next 服务（后续接入，`next.config.ts` 已开启 `standalone` 输出）

## 快速开始

```bash
pnpm install
pnpm dev          # 开发：http://localhost:3000
pnpm build        # 构建
pnpm start        # 生产：http://localhost:3000
```

要求 Node.js 22+。桌面端集成前，直接用浏览器访问即可。

> macOS 提示：如 `pnpm dev` 出现 `Watchpack Error ... EMFILE` 文件监视告警且启动异常，先在终端执行 `ulimit -n 4096` 再启动。

## 目录结构

```
atrium/
├── src/
│   ├── app/                  页面与 API（App Router）
│   │   ├── page.tsx          中庭（首页）
│   │   ├── study|gallery|tools|atelier/page.tsx  四间房
│   │   └── api/
│   │       ├── providers/    内容源清单与配置状态
│   │       ├── config/       站点配置读写（合并式，永不整体覆盖）
│   │       └── posts/        文章列表（服务端缓存 + 降级语义）
│   ├── components/
│   │   ├── shell/            侧栏、主题切换、页脚
│   │   ├── home/             首页区块（问候、天井、四扇门、列表、常用）
│   │   └── RoomStub.tsx      房间占位组件（迁移中状态）
│   └── lib/
│       ├── config.ts         配置解析（环境变量 > data/config.json）
│       ├── content.ts        内容服务（列表、缓存、降级）
│       └── providers/        内容源抽象（GitHub / Gitee / 可扩展）
├── design/                   静态方向样板（视觉基准，可直接双击浏览）
├── data/                     运行时数据（config.json 不进 git）
└── next.config.ts
```

## 配置内容源

读取公开仓库不需要令牌；写入（发文章、传图）需要。优先级：**环境变量 > `data/config.json`**。

| 内容源 | 环境变量 |
| --- | --- |
| GitHub | `GITHUB_OWNER` `GITHUB_REPO` `GITHUB_BRANCH` `GITHUB_TOKEN` |
| Gitee | `GITEE_OWNER` `GITEE_REPO` `GITEE_BRANCH` `GITEE_TOKEN` |

未配置时首页显示设计好的空态；配置后自动出现最近文章。也可以直接 `POST /api/config` 写入本地配置（文件权限 0600，且不会被 git 跟踪）。

## 常见问题

**抓取仓库失败，报 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`？**

本机有对 GitHub 做代理/加速的工具（如 Watt Toolkit）时，Node 不信任其自签根证书。
按 `certs/README.md` 导出证书后，改用 `pnpm dev:cert` / `pnpm start:cert` 启动即可。

**首页没有文章？**

- 未配置内容源时会显示设计好的空态；配置后自动出现最近文章。
- 仓库是私有的：读取同样需要 `GITHUB_TOKEN`。

## 设计系统

视觉完全来自 `design/` 样板的 tokens（暖纸底 + 松绿强调色，双主题，oklch 定义）。
在 Tailwind v4 里以 CSS 变量 + `@theme inline` 暴露：`bg-surface`、`text-ink-2`、`border-line`、`text-accent` 等工具类直接可用；
深色主题挂在 `<html data-theme="dark">` 上，首帧前由内联脚本决定（支持记忆与 `?theme=dark` 调试参数）。

## 扩展指南

**新增内容源（如 GitLab / Gitea）**

1. 在 `src/lib/providers/` 新建实现文件，对齐 `RepoProvider` 接口（`types.ts`）；
2. 在 `PROVIDER_KEYS` 登记 key；
3. 到 `providers/index.ts` 的 `FACTORIES` 注册。
   完成这三步，首页、列表、后续编辑器等所有功能自动获得对新数据源的支持，无需改动业务代码。

**新增房间页面**

1. `src/app/<room>/page.tsx` 建页面；
2. 在 `src/components/shell/Sidebar.tsx` 的 `rooms` 数组加一项（含图标与单字标签）。

## 路线

- [x] 项目命名与重构蓝图（`design/docs/`）
- [x] 静态方向样板（`design/`）
- [x] Next.js 骨架：首页 + 四间房路由 + 内容源抽象
- [ ] 书房：列表与阅读页接通真实数据
- [ ] 画廊 / 工具房 / 陈列廊逐间迁移
- [ ] Electron 壳（本地服务模式）与打包
