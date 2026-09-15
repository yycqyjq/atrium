import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import StudyList from "@/components/study/StudyList";
import { listPosts, type ContentReason, type PostMeta } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "书房" };

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
          <StudyList posts={items} />
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
