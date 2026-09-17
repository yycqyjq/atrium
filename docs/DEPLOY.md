# 中庭 · 部署指南（Vercel）

中庭是 Next.js 应用，可以一键部署到 Vercel（免费额度足够个人使用）。
仓库即数据库：Vercel 上的网页版和你桌面上的 App 读的是同一个 GitHub 仓库。

## 一、部署步骤

1. 打开 <https://vercel.com/new>，用 GitHub 账号登录（本仓库直接 Import 即可）；
2. Import 该仓库，Framework 自动识别为 Next.js，构建命令与输出**全部保持默认**（不用填）；
3. 在 **Environment Variables** 中添加：

| 变量 | 值（示例） | 说明 |
| --- | --- | --- |
| `GITHUB_OWNER` | `你的账号` | 内容仓库归属 |
| `GITHUB_REPO` | `你的内容仓库` | 内容仓库名（文章 + admin/tools.json） |
| `GITHUB_BRANCH` | `main` | 分支 |
| `GITHUB_TOKEN` | `ghp_…`（可选但**强烈建议**） | 提升速率限制 60/h → 5000/h |
| `ATRIUM_DEFAULT_PROVIDER` | `github` | 缺省即 github，可省略 |
| `GITHUB_GALLERY_REPO` | `你的画廊仓库` | 画廊用独立仓库（不设则跟主仓库） |
| `ATRIUM_GALLERY_DIR` | ``（留空 = 仓库根） | 画廊图片目录 |
| `ATRIUM_DEMO_PROJECTS` | （可选，JSON 数组） | 工坊的组件项目；不设则读 data/config.json（部署版无本地文件，建议用这个变量） |
| `NEXT_PUBLIC_SITE_URL` | `https://你的域名` | RSS / sitemap 里的站点地址；不设时为占位符 `https://atrium.local` |

4. 点 **Deploy**，一分钟内完成，得到 `https://atrium-<你的子域>.vercel.app`。

> 建议在 Vercel 项目 Settings → Domains 里绑定自己的域名（可选）。

## 二、为什么建议配 GITHUB_TOKEN

未配置令牌时，GitHub 匿名限额是 **60 次/小时**（按 IP 共享），部署实例与本地开发共享同一出口 IP 时会互相挤占。配置后变为 **5000 次/小时**，且按令牌计，网页版稳定得多。

生成令牌：<https://github.com/settings/tokens>（Fine-grained 或 classic 均可，勾选 `repo`（或按仓库授权）能读取你的内容仓库即可）。

## 三、画廊图源说明

图片默认走 **jsDelivr 国内线路**（`gcore.jsdelivr.net`），加载失败自动降级到 GitHub raw。
注意 jsDelivr 对分支内容有缓存（数小时），刚推送的新图可能短暂未更新，降级链会自动用 raw 补位。

## 四、部署后验证

- 打开首页：应显示中庭门厅与五间房入口（书房 / 画廊 / 工具房 / 工坊 / 陈列廊）；
- `/study`：文章列表来自内容仓库根目录的 `.md` 文件；
- `/gallery`：图片来自画廊仓库；
- `/tools`：书签来自内容仓库的 `admin/tools.json`；
- `/workshop`：展品来自组件仓库的 `atrium.json` 清单（取件后在页面内渲染；大部分运行时资产走仓库同源，仓颉编辑器体积最大的那件首次打开需可访问阿里 CDN 或 npmmirror）；
- `/atelier`：组件陈列廊（纯静态）；
- `/api/providers`：`{"github":{"configured":true,...}}` 即接入正常。

## 五、与桌面端的关系

- 桌面 App（打包产物在 `~/Desktop/atrium-dist/`，日常入口是其中的 `中庭.app`）走本地服务，数据目录在 `~/Library/Application Support/atrium-desktop/`；
- 网页版走 Vercel，两边读同一个仓库，内容一致；
- 桌面端配置令牌：把 `GITHUB_TOKEN` 写进 `data/config.json`（打包版在 userData/data/ 下）。
