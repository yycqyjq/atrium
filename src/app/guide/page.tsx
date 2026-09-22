import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "使用教程" };

const TOC: Array<[string, string, string]> = [
  ["connect", "01", "接入内容源"],
  ["study", "02", "书房与阅读"],
  ["write", "03", "写作台"],
  ["gallery", "04", "画廊"],
  ["tools", "05", "工具房"],
  ["workshop", "06", "工坊"],
  ["atelier", "07", "陈列廊"],
  ["search", "08", "全局搜索与导航"],
  ["desktop", "09", "桌面端"],
  ["faq", "10", "常见问题"],
];

function Section({ id, no, title, children }: { id: string; no: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-baseline gap-3">
        <span aria-hidden className="font-mono text-[12px] tracking-[0.08em] text-accent">{no}</span>
        <h2 className="font-serif text-[21px] font-semibold tracking-[0.01em] text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-[20px] shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-medium text-accent-ink tabular-nums"
      >
        ·
      </span>
      <span className="text-[13.5px] leading-[1.8] text-ink-2">{children}</span>
    </li>
  );
}

function Code({ label, code }: { label: string; code: string }) {
  return (
    <details className="group/code my-3">
      <summary className="cursor-pointer list-none text-[12.5px] text-ink-3 transition-colors duration-150 hover:text-ink-2">
        <span className="mr-1.5 inline-block transition-transform duration-150 group-open/code:rotate-90">▸</span>
        {label}
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-ctl border border-line bg-wash px-3.5 py-3 text-[12px] leading-[1.7] text-ink-2">
        <code>{code}</code>
      </pre>
    </details>
  );
}

function Cross({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors duration-150 hover:decoration-accent"
    >
      {label}
    </Link>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-3" />
          <span className="text-[13.5px] leading-[1.8] text-ink-2">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto grid max-content grid-cols-1 gap-x-12 px-6 py-10 xl:grid-cols-[200px_minmax(0,1fr)] xl:px-10">
      <aside className="hidden xl:sticky xl:top-6 xl:block xl:self-start">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">目录</p>
        <nav aria-label="教程目录">
          {TOC.map(([id, no, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="block border-l-2 border-transparent py-[5px] pl-3 text-[13px] leading-snug text-ink-3 transition-colors duration-150 hover:border-accent/60 hover:text-ink-2"
            >
              <span className="mr-2 font-mono text-[11px]">{no}</span>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 max-w-[760px]">
        <header className="pb-8">
          <p className="mb-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-3">中庭 · 使用教程</p>
          <h1 className="font-serif text-[34px] font-semibold leading-[1.2] tracking-[0.01em] text-ink">
            把每个功能用明白
          </h1>
          <p className="mt-4 max-w-[46em] text-[15px] leading-[1.9] text-ink-2">
            中庭的一切都在这一页：怎么接入内容源、五间房各自怎么用、桌面端怎么装怎么更。每一段都可以独立查阅——遇到不会用的功能，从右侧目录跳过来就行。
          </p>
        </header>

        <div className="space-y-12">
          <Section id="connect" no="01" title="接入内容源">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">
              中庭的内容不存数据库——文章、图片、书签都以文件形式放在你自己的 GitHub 仓库里，应用只负责取用与呈现。因此第一步是把仓库「接」进来。
            </p>
            <ol className="space-y-3.5">
              <Step>点侧栏底部的头像或 ⚙ 齿轮，打开「设置」页。</Step>
              <Step>填入 GitHub 用户名、内容仓库名与分支——文章会以 Markdown 直接存进这个仓库，任何仓库都行。</Step>
              <Step>
                粘贴一个访问令牌：细粒度（Fine-grained）或 classic 均可，需要对内容仓库有读写权限。写文章必需；仓库公开时不填令牌也能读，但匿名额度很低，不推荐。
              </Step>
              <Step>保存即生效——各房间的列表立刻点亮，写作台也随之可用。</Step>
            </ol>
            <Bullets
              items={[
                "配置只保存在本机（userData/data/config.json），不会上传到任何地方。",
                "支持多个内容源：设置页可切换 GitHub / Gitee，仓库结构保持一致即可。",
                "写操作（发文、上传、删除）仅桌面端开放——部署到公网的网页版默认只读。",
              ]}
            />
          </Section>

          <Section id="study" no="02" title="书房与阅读">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">书房是文章的家：按文件夹归档，按修改时间排序，所有文章都是仓库里的 Markdown 文件。</p>
            <Bullets
              items={[
                "浏览：文件夹切换 + 页内全文搜索（标题、正文即时过滤），长列表可用楼层导航快速定位。",
                "阅读体验：顶部阅读进度条、「约 N 分钟读完」、目录跳转、代码高亮、mermaid 图表自动渲染、参考链接集中陈列。",
                "文件夹管理：书房页可新建文件夹，文章列表支持拖拽排序之外的一切常规操作。",
              ]}
            />
            <p className="mt-4 text-[13px] text-ink-3">
              动手试：<Cross href="/study" label="打开书房" /> —— 任意点开一篇，感受一下阅读页。
            </p>
          </Section>

          <Section id="write" no="03" title="写作台">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">侧栏的「写作台」是发文入口：标题、正文、文件夹三步成文，正文即 Markdown，所见即所得地存进仓库。</p>
            <ol className="space-y-3.5">
              <Step>写标题与正文，选一个文件夹（也可现场新建多级目录）。</Step>
              <Step>正文里贴外链图片，发布时会自动转存到图床仓库——链接永不失效。</Step>
              <Step>点发布：文章立即出现在书房，无需刷新。</Step>
            </ol>
            <Bullets
              items={[
                "编辑与删除都在文章页行内完成：点「编辑」进入写作台回填内容，删除有原位确认。",
                "「回到这篇」常驻写作台，一键回到最近编辑的那篇。",
                "渲染增强：mermaid 代码块自动成图；失败时回退显示源码，不吞内容。",
              ]}
            />
            <p className="mt-4 text-[13px] text-ink-3">
              动手试：<Cross href="/study/write" label="打开写作台" />。
            </p>
          </Section>

          <Section id="gallery" no="04" title="画廊">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">照片与影像的家。图片以文件形式存在图床仓库里，应用负责陈列。</p>
            <ol className="space-y-3.5">
              <Step>上传：拖拽或选择本地图片直传；也可以粘贴外链图片地址，服务端抓取后转存（自动防内网地址）。</Step>
              <Step>管理：重命名、删除（原位确认）；默认按提交时间展示日期。</Step>
              <Step>浏览：点击进灯箱，← / → 切换，Esc 关闭；画廊页内按文件名即时检索。</Step>
            </ol>
            <p className="mt-4 text-[13px] text-ink-3">
              动手试：<Cross href="/gallery" label="打开画廊" />。
            </p>
          </Section>

          <Section id="tools" no="05" title="工具房">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">书签与常用工具的收纳间：数据来自内容仓库的 admin/tools.json，页面上可以直接增删改。</p>
            <ol className="space-y-3.5">
              <Step>粘贴一个网址，标题与描述自动带回（服务端解析，带内网防护），不满意可手改。</Step>
              <Step>分组、排序、编辑、删除都在原位完成。</Step>
              <Step>工具房页内搜索：名称与描述即时过滤。</Step>
            </ol>
            <Code
              label="tools.json 书签清单格式"
              code={`{
  "categories": ["开发", "AI", "效率"],
  "items": [
    {
      "name": "GitHub",
      "url": "https://github.com",
      "description": "代码托管与协作",
      "category": "开发"
    }
  ]
}`}
            />
            <p className="mt-4 text-[13px] text-ink-3">
              动手试：<Cross href="/tools" label="打开工具房" />。
            </p>
          </Section>

          <Section id="workshop" no="06" title="工坊">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">
              工坊陈列「组件仓库」里的展品：仓库里放一份 atrium.json 展品清单与构建产物，工坊按清单现场取件、真实运行。自带的砖瓦（bricks）模板仓库可以直接参考。
            </p>
            <Code
              label="atrium.json 展品清单格式"
              code={`{
  "exhibits": [
    {
      "id": "toast",                     // 与构建产物同名
      "title": "Toast 提示",
      "desc": "轻量反馈提示，自动排队",
      "group": "反馈",
      "entry": "dist/exhibits/toast.js", // ESM 产物，导出 mount(el) => cleanup
      "styles": ["dist/exhibits/toast.css"],
      "usage": "mount(el, { duration: 2800 })",
      "props": []
    }
  ]
}`}
            />
            <p className="mt-4 text-[13px] text-ink-3">
              动手试：<Cross href="/workshop" label="打开工坊" />。
            </p>
          </Section>

          <Section id="atelier" no="07" title="陈列廊">
            <p className="mb-4 max-w-[46em] text-[14px] leading-[1.9] text-ink-2">
              陈列廊是中庭自身公共组件的活文档：每个示例都是真实组件，所见即所用。右上角的密度切换（舒适 / 紧凑）改变全站留白与行距，偏好会被记住。
            </p>
            <p className="text-[13px] text-ink-3">
              动手试：<Cross href="/atelier" label="打开陈列廊" />。
            </p>
          </Section>

          <Section id="search" no="08" title="全局搜索与导航">
            <Bullets
              items={[
                "⌘K（Ctrl+K）唤起全局搜索：一框搜文章、展品、图片、书签四类内容，回车直达第一条。",
                "图片类命中会深链到画廊并自动打开对应灯箱。",
                "移动端：底部楼层导航横滑切换房间；侧栏在窄屏收拢为图标。",
              ]}
            />
            <p className="mt-4 text-[13px] text-ink-3">提示：先按 ⌘K，再输入「踩坑」试试——应该能直接跳到那篇记录。</p>
          </Section>

          <Section id="desktop" no="09" title="桌面端">
            <Bullets
              items={[
                "打包：pnpm desktop:dist 产出独立 .app 与 dmg；自检：desktop:smoke 隐藏窗口全链验证后自动退出。",
                "云端发布：推送 v* 版本标签（或手动运行「发布安装包」），GitHub Actions 自动构建 macOS（arm64）与 Windows 安装包并发布到 Releases。",
                "证书：本机网络加速工具（如 Watt Toolkit）的证书放到 userData/certs/ 自动加载；开发态自动读项目 certs/ 目录。",
                "数据位置：userData/data/ 下（config.json 配置、cache/ 缓存），升级与重装都不会动它。",
                "检查更新：应用启动后台静默查询 Releases，菜单「检查更新」可手动触发；有新版会提示并跳转下载。",
              ]}
            />
          </Section>

          <Section id="faq" no="10" title="常见问题">
            <Bullets
              items={[
                "房间空白、但文章能显示：多半是网络加速工具的证书没被加载——按第 09 节把证书放到 userData/certs/ 并重启应用。",
                "令牌保存后输入框仍是空的：设计如此——令牌只写本机不回显，留空表示保持不变；保存成功会有提示。",
                "部署到公网后能写文章吗：默认只读。写入能力只开放给桌面端（自动带写开关），公网版本保持只读更安全。",
                "发布后列表多久刷新：写入即失效、立即重取；日常阅读走缓存（先旧后新），源站故障时自动保旧数据，不会白屏。",
              ]}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/connect" variant="secondary">去设置</ButtonLink>
              <ButtonLink href="/" variant="secondary">回中庭</ButtonLink>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
