import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";

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
    <section className="mb-12">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="font-serif text-[17px] tracking-[0.02em]">{title}</h2>
        {note ? <span className="text-right text-[12px] text-ink-3">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function AtelierPage() {
  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">陈列廊</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            陈列廊
          </h1>
          <p className="max-w-[34em] text-ink-2">组件与实验。作品的小展台。</p>
        </header>

        <Section title="色板" note="双主题 · 随系统或手动切换">
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {swatches.map((swatch) => (
              <div key={swatch.token} className="overflow-hidden rounded-ctl border border-line">
                <div className={`h-14 border-b border-line ${swatch.className}`} />
                <div className="bg-raised px-3 py-2">
                  <p className="text-[13px]">{swatch.name}</p>
                  <p className="font-mono text-[10.5px] tracking-[0.02em] text-ink-3">{swatch.token}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="排印" note="宋体标题 · 黑体正文 · 等宽代码">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">标题 · 宋　34 / 600</p>
              <p className="font-serif text-[34px] font-semibold leading-tight tracking-[0.03em]">中庭</p>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">引文 · 宋　19</p>
              <p className="font-serif text-[19px] leading-relaxed tracking-[0.02em]">
                庭中有奇树，绿叶发华滋。
              </p>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">正文 · 黑　14.5 / 1.75</p>
              <p className="text-[14.5px] leading-[1.75] text-ink-2">
                中庭是个人空间，内容存放在你自己的仓库里。文字为先，安静，克制，留白充分。
              </p>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">等宽 · Mono　13</p>
              <p className="font-mono text-[13px] text-ink-2">pnpm build && pnpm desktop:cert</p>
            </div>
          </div>
        </Section>

        <Section title="组件" note="按钮 · 标签 · 卡片 · 引用 · 代码">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">按钮</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-ctl bg-accent px-4 py-2 text-[13.5px] font-medium tracking-[0.02em] text-on-accent">
                  主要操作
                </span>
                <span className="rounded-ctl border border-line px-4 py-2 text-[13.5px] text-ink-2">
                  次要操作
                </span>
              </div>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">标签</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-ctl border border-accent bg-accent-soft px-[13px] py-[5px] text-[12.5px] font-medium text-accent-ink">
                  选中
                </span>
                <span className="rounded-ctl border border-line px-[13px] py-[5px] text-[12.5px] text-ink-3">
                  未选中
                </span>
              </div>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">卡片</p>
              <div className="rounded-ctl border border-line px-4 py-3">
                <p className="mb-0.5 font-medium tracking-[0.01em]">卡片标题</p>
                <p className="text-[12px] text-ink-3">次要说明文字</p>
              </div>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">引用</p>
              <blockquote className="border-l-2 border-accent bg-accent-soft/50 px-4 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
                把想留下的东西，放在自己院子里。
              </blockquote>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">代码</p>
              <p className="mb-2 text-[13px] text-ink-2">
                行内代码 <code className="rounded bg-wash px-1.5 py-0.5 font-mono text-[12px] text-accent-ink">pnpm dev</code>
              </p>
              <pre className="overflow-x-auto rounded-ctl border border-line bg-raised px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-ink-2">
                {"$ git add -A\ngit commit -m 'feat: ...'"}
              </pre>
            </div>
            <div className="rounded-ctl border border-line px-5 py-4">
              <p className="mb-3 text-[11px] tracking-[0.12em] text-ink-3">链接行</p>
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                前往{" "}
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover">
                  外部链接
                </a>{" "}
                或<span className="mx-0.5 text-accent">站内页面</span>，下划线随悬停加深。
              </p>
            </div>
          </div>
        </Section>

        <Section title="空态与提示" note="房间通用">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-ctl border border-line py-10 text-center">
              <p className="mb-2 font-serif text-[17px] tracking-[0.02em]">此厢仍在布置中。</p>
              <p className="text-[13px] text-ink-3">空白不是错误，是留给未来的位置。</p>
            </div>
            <div className="flex items-center justify-center rounded-ctl border border-line py-10">
              <p className="rounded-ctl border border-accent bg-accent-soft px-4 py-2 text-[13px] text-accent-ink">
                提示条：强调底色，用于轻量告知。
              </p>
            </div>
          </div>
        </Section>

        <p className="text-[12.5px] leading-relaxed tracking-[0.03em] text-ink-3">
          本页是中庭的活文档：新的组件与实验会先在这里亮相，稳定后再进入各个房间。
        </p>
      </div>
      <Footer />
    </>
  );
}
