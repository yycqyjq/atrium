import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Input, Textarea, FieldLabel } from "@/components/ui/Field";
import BackLink from "@/components/ui/BackLink";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import SectionHeading from "@/components/ui/SectionHeading";
import { ToolCardContent } from "@/components/tools/ToolCard";
import PostRow from "@/components/study/PostRow";
import { SearchDemo, ComboboxDemo } from "@/components/atelier/Demos";
import DensityToggle from "@/components/atelier/DensityToggle";
import {
  IconMark,
  IconHome,
  IconBook,
  IconFrame,
  IconToolbox,
  IconColumns,
  IconCraft,
  IconMoon,
  IconSun,
  IconArrowRight,
  IconExternal,
  IconArrowUpRight,
  IconPlus,
  IconX,
  IconPencil,
  IconGear,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconLink,
} from "@/components/icons";

export const metadata: Metadata = { title: "陈列廊" };

const swatches: { name: string; token: string; className: string }[] = [
  { name: "纸面", token: "--surface", className: "bg-surface" },
  { name: "纸面·浮起", token: "--surface-raised", className: "bg-raised" },
  { name: "底色", token: "--wash", className: "bg-wash" },
  { name: "线", token: "--line", className: "bg-line" },
  { name: "线·强", token: "--line-strong", className: "bg-line-strong" },
  { name: "墨", token: "--ink", className: "bg-ink" },
  { name: "墨·次级", token: "--ink-2", className: "bg-ink-2" },
  { name: "墨·弱", token: "--ink-3", className: "bg-ink-3" },
  { name: "强调", token: "--accent", className: "bg-accent" },
  { name: "强调·淡", token: "--accent-soft", className: "bg-accent-soft" },
  { name: "强调·字", token: "--accent-ink", className: "bg-accent-ink" },
  { name: "纹样", token: "--motif", className: "bg-motif" },
];

const iconSet: { name: string; icon: React.ReactNode }[] = [
  { name: "Mark", icon: <IconMark className="size-[18px]" /> },
  { name: "Home", icon: <IconHome className="size-[18px]" /> },
  { name: "Book", icon: <IconBook className="size-[18px]" /> },
  { name: "Frame", icon: <IconFrame className="size-[18px]" /> },
  { name: "Toolbox", icon: <IconToolbox className="size-[18px]" /> },
  { name: "Columns", icon: <IconColumns className="size-[18px]" /> },
  { name: "Craft", icon: <IconCraft className="size-[18px]" /> },
  { name: "Moon", icon: <IconMoon className="size-[18px]" /> },
  { name: "Sun", icon: <IconSun className="size-[18px]" /> },
  { name: "ArrowRight", icon: <IconArrowRight className="size-[18px]" /> },
  { name: "External", icon: <IconExternal className="size-[18px]" /> },
  { name: "ArrowUpRight", icon: <IconArrowUpRight className="size-[18px]" /> },
  { name: "Plus", icon: <IconPlus className="size-[18px]" /> },
  { name: "X", icon: <IconX className="size-[18px]" /> },
  { name: "Pencil", icon: <IconPencil className="size-[18px]" /> },
  { name: "Gear", icon: <IconGear className="size-[18px]" /> },
  { name: "ChevronLeft", icon: <IconChevronLeft className="size-[18px]" /> },
  { name: "ChevronRight", icon: <IconChevronRight className="size-[18px]" /> },
  { name: "Search", icon: <IconSearch className="size-[18px]" /> },
  { name: "Link", icon: <IconLink className="size-[18px]" /> },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 [[data-density=compact]_&]:mb-8">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-3 [[data-density=compact]_&]:mb-4">
        <h2 className="font-serif text-[17px] tracking-[0.02em]">{title}</h2>
        {note ? <span className="text-right text-[12px] text-ink-3">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

const demoPost = {
  slug: "示例文章",
  title: "示例文章 · 文章行组件",
  description: "书房列表与陈列廊共用的文章行（真实组件渲染）。",
  dateLabel: "9月16日",
  folder: "示例目录",
  tags: [],
};

const demoPost2 = {
  slug: "示例文章二",
  title: "第二行 · 悬停试试",
  description: "",
  dateLabel: "9月15日",
  folder: "示例目录",
  tags: [],
};

const demoTool = {
  name: "GitHub",
  url: "https://github.com",
  description: "代码托管与协作。此卡片由工具房同款公共组件渲染。",
};

export default function AtelierPage() {
  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "陈列廊" }]}
          title="陈列廊"
          subtitle="组件与实验。本页即组件库实物：下列部件均直接引用应用内公共组件（改一处、处处同步），新组件先在这里亮相。"
          extra={
            <div className="ml-auto">
              <DensityToggle />
            </div>
          }
        />

        <div id="atelier-root" data-density="default" data-floor-nav>
          <Section title="色板" note="双主题 · 随系统或手动切换">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6 [[data-density=compact]_&]:gap-2">
              {swatches.map((swatch) => (
                <div key={swatch.token} className="overflow-hidden rounded-ctl border border-line">
                  <div className={`h-14 border-b border-line [[data-density=compact]_&]:h-12 ${swatch.className}`} />
                  <div className="bg-raised px-3 py-2">
                    <p className="text-[13px]">{swatch.name}</p>
                    <p className="font-mono text-[10.5px] tracking-[0.02em] text-ink-3">{swatch.token}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="排印" note="宋体标题 · 黑体正文 · 等宽代码">
            <div className="grid gap-3 md:grid-cols-2 [[data-density=compact]_&]:gap-2">
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">标题 · 宋　34 / 600</p>
                <p className="font-serif text-[34px] font-semibold leading-tight tracking-[0.03em]">中庭</p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">引文 · 宋　19</p>
                <p className="font-serif text-[19px] leading-relaxed tracking-[0.02em]">
                  庭中有奇树，绿叶发华滋。
                </p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">正文 · 黑　14.5 / 1.75</p>
                <p className="text-[14.5px] leading-[1.75] text-ink-2">
                  中庭是个人空间，内容存放在你自己的仓库里。文字为先，安静，克制，留白充分。
                </p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">等宽 · Mono　13</p>
                <p className="font-mono text-[13px] text-ink-2">pnpm build && pnpm desktop</p>
              </Card>
            </div>
          </Section>

          <Section title="图标" note="20 枚 · 全站唯一来源">
            <Card padding="sm">
              <div className="grid grid-cols-5 gap-x-3 gap-y-5 sm:grid-cols-7 md:grid-cols-10">
                {iconSet.map(({ name, icon }) => (
                  <div key={name} className="flex flex-col items-center gap-2.5 text-ink-2">
                    {icon}
                    <span className="text-[10.5px] tracking-[0.02em] text-ink-3">{name}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
                全站所有图标均出自这里（改一处、处处同步）；导航、按钮、卡片上的小箭头与符号都是它们的实例。
              </p>
            </Card>
          </Section>

          <Section title="交互控件" note="真实组件 · 本页可直接操作">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 [[data-density=compact]_&]:gap-2">
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">按钮</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button>主要操作</Button>
                  <Button variant="secondary">次要操作</Button>
                  <Button variant="danger" size="sm">危险确认</Button>
                  <Button disabled>禁用状态</Button>
                  <Button variant="text">文字按钮</Button>
                  <Button variant="quiet" size="sm">静默按钮</Button>
                </div>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">胶囊标签（Chip）</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip href="#controls" active>
                    选中
                  </Chip>
                  <Chip href="#controls">未选中</Chip>
                </div>
              </Card>
              <Card padding="sm" className="md:col-span-2 xl:col-span-1">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">搜索框（SearchInput）</p>
                <SearchDemo />
              </Card>
            </div>
          </Section>

          <Section title="内容单元" note="工具卡片 / 文章行 · 与房间共用">
            <div className="grid gap-3 md:grid-cols-2 [[data-density=compact]_&]:gap-2">
              <a
                href={demoTool.url}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong [[data-density=compact]_&]:px-3.5 [[data-density=compact]_&]:py-3"
              >
                <ToolCardContent name={demoTool.name} url={demoTool.url} description={demoTool.description} />
              </a>
              <Card padding="none" className="px-4 pb-1 pt-1">
                <PostRow post={demoPost} showFolder />
                <PostRow post={demoPost2} />
              </Card>
            </div>
          </Section>

          <Section title="文本与标记" note="引用 / 代码 / 链接">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 [[data-density=compact]_&]:gap-2">
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">引用</p>
                <blockquote className="border-l-2 border-accent bg-accent-soft/50 px-4 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  把想留下的东西，放在自己院子里。
                </blockquote>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">代码</p>
                <p className="mb-2 text-[13px] text-ink-2">
                  行内代码 <code className="rounded bg-wash px-1.5 py-0.5 font-mono text-[12px] text-accent-ink">pnpm dev</code>
                </p>
                <pre className="overflow-x-auto rounded-ctl border border-line bg-raised px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-ink-2 [[data-density=compact]_&]:px-3 [[data-density=compact]_&]:py-2">
                  {"$ git add -A\ngit commit -m 'feat: ...'"}
                </pre>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">链接行</p>
                <p className="text-[13.5px] leading-relaxed text-ink-2">
                  前往{" "}
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover">
                    外部链接
                  </a>{" "}
                  或<span className="mx-0.5 text-accent">站内页面</span>，下划线随悬停加深。
                </p>
              </Card>
            </div>
          </Section>

          <Section title="结构与导航" note="分组标题 / 楼层目录">
            <div className="grid gap-3 md:grid-cols-2 [[data-density=compact]_&]:gap-2">
              <Card padding="sm" data-floor-skip>
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">分组标题（SectionHeading）</p>
                <SectionHeading title="示例分组" count="12 篇" href="#structure" />
                <p className="mt-3 text-[12px] text-ink-3">书房目录与工具房分类同款；右缘「进入」可下钻。</p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">楼层目录（FloorNav）</p>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  本页右侧即为实物：横杠列随滚动高亮；鼠标划过某根横杠，它在原位变成对应标题、其余保持横杠。
                  该组件同时用于工具房与书房。
                </p>
              </Card>
            </div>
          </Section>

          <Section title="状态与提示" note="空态 / 提示条 / 载入态">
            <div className="grid gap-3 md:grid-cols-2 [[data-density=compact]_&]:gap-2">
              <Card padding="none">
                <EmptyState title="房间级空态。" sub="衬线标题 + 副文案（EmptyState 组件）。" />
              </Card>
              <Card padding="none">
                <EmptyState variant="search" title="没有找到「示例词」。" sub="搜索无结果的轻量空态。" />
              </Card>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-ctl border border-line py-8 [[data-density=compact]_&]:py-6">
              <Alert size="sm" tone="error">提示条：强调底色，用于错误与警告（Alert · error）。</Alert>
              <Alert size="sm" tone="ok">提示条：描边浅面，用于常规告知（Alert · ok）。</Alert>
            </div>
            <div className="mt-3 flex items-center justify-center rounded-ctl border border-line py-8 [[data-density=compact]_&]:py-6">
              <Loading label="载入中…（路由切换与等待时同款）" />
            </div>
          </Section>

          <Section title="表单与字段" note="输入框 / 文本域 / 标签 / 下拉 · 全站同款">
            <div className="grid gap-3 md:grid-cols-2 [[data-density=compact]_&]:gap-2">
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">输入框（Input）</p>
                <FieldLabel htmlFor="demo-input">示例标签（FieldLabel）</FieldLabel>
                <Input id="demo-input" placeholder="标准输入框 · 设置页同款" />
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">文本域（Textarea）</p>
                <Textarea
                  mono
                  className="min-h-[96px] resize-y"
                  placeholder={"等宽字体 · 写作台正文同款\nMarkdown 格式"}
                />
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">返回链接（BackLink）</p>
                <BackLink href="#structure">回到结构与导航</BackLink>
                <p className="mt-3 text-[12px] text-ink-3">文章页尾部「回到书房」同款；悬停变主题色并向左位移。</p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">面包屑（Breadcrumb）</p>
                <Breadcrumb
                  items={[{ label: "中庭", href: "/" }, { label: "书房", href: "/study" }, { label: "示例目录" }]}
                />
                <p className="mt-3 text-[12px] text-ink-3">页面头部与文章页同款；中间段可点击，末段为当前位置。</p>
              </Card>
              <Card padding="sm">
                <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">可输入下拉（Combobox）</p>
                <ComboboxDemo />
                <p className="mt-3 text-[12px] text-ink-3">输入即筛选候选、也可直接输入新值；上下键与回车可选，工具房「分类」同款。</p>
              </Card>
            </div>
          </Section>

          <p className="text-[12.5px] leading-relaxed tracking-[0.03em] text-ink-3">
            本页是中庭的活文档：所有部件均直接引用应用内公共组件（位于 src/components），不做二次描摹；
            改一处、处处同步。新的组件与实验会先在这里亮相，稳定后再进入各个房间。
          </p>
        </div>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
