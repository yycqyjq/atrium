import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import { listPosts, type ContentReason, type PostMeta } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "书房" };

type MonthGroup = { key: string; label: string; items: PostMeta[] };

function groupByMonth(items: PostMeta[]): MonthGroup[] {
  const nowYear = new Date().getFullYear();
  const groups: MonthGroup[] = [];
  for (const item of items) {
    const d = item.lastModified ? new Date(item.lastModified) : null;
    const key = d ? `${d.getFullYear()}-${d.getMonth() + 1}` : "unknown";
    const label = d
      ? `${d.getFullYear() !== nowYear ? `${d.getFullYear()}年` : ""}${d.getMonth() + 1}月`
      : "未记日期";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

function emptyCopy(reason: ContentReason) {
  if (reason === "not-configured") {
    return {
      title: "还没有接通内容源。",
      sub: "配置仓库后，这里会显示你的全部文章。",
    };
  }
  if (reason === "fetch-failed") {
    return {
      title: "内容源暂时连不上。",
      sub: "检查网络或访问令牌，稍后再试。",
    };
  }
  return {
    title: "书房还是空的。",
    sub: "在仓库里写下第一篇 Markdown，这里就会亮起来。",
  };
}

export default async function StudyPage() {
  const { items, reason } = await listPosts();
  const groups = groupByMonth(items);
  const copy = emptyCopy(reason);

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">书房</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            书房
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="max-w-[34em] text-ink-2">文章与长文。读也好，写也好，都在这里。</p>
            <Link
              href="/study/write"
              className="group inline-flex items-center gap-1.5 text-[12.5px] tracking-[0.03em] text-accent transition-colors duration-150 hover:text-accent-hover"
            >
              写作台
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px] transition-transform duration-200 group-hover:translate-x-0.5">
                <path d="M5 12 H19" />
                <path d="M13.5 6.5 L19 12 L13.5 17.5" />
              </svg>
            </Link>
          </div>
        </header>

        {items.length > 0 ? (
          <div>
            {groups.map((group) => (
              <section key={group.key} className="mt-9 first:mt-3">
                <h2 className="mb-1 text-[12.5px] font-medium tracking-[0.14em] text-ink-2">
                  {group.label}
                </h2>
                <ul>
                  {group.items.map((post) => (
                    <li key={post.path} className="border-b border-line last:border-0">
                      <Link
                        href={`/study/${post.slug}`}
                        className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-start gap-[22px] rounded-ctl py-4 pr-3 transition-colors duration-150 hover:bg-wash max-xs:block max-xs:pr-0"
                      >
                        <span className="flex flex-col gap-0.5 pt-[3px] text-[12.5px] leading-[1.7] text-ink-3 tabular-nums max-xs:mb-1 max-xs:flex-row max-xs:gap-2.5 max-xs:pt-0">
                          <span>{post.dateLabel}</span>
                        </span>
                        <span className="block min-w-0">
                          <span className="block font-serif text-[17px] leading-normal tracking-[0.015em] text-ink">
                            {post.title}
                          </span>
                          {post.description ? (
                            <span className="mt-1 block max-w-[44em] text-[13px] leading-[1.65] text-ink-3">
                              {post.description}
                            </span>
                          ) : null}
                        </span>
                        {post.category ? (
                          <span className="mt-1 hidden text-right text-[12.5px] tracking-[0.05em] text-ink-3 sm:block">
                            {post.category}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="mt-7 text-[12.5px] tracking-[0.05em] text-ink-3">共 {items.length} 篇</p>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{copy.title}</p>
            <p className="text-[13px] text-ink-3">{copy.sub}</p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
