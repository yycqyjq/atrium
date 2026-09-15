import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import type { ContentReason, PostMeta } from "@/lib/content";

type Props = {
  items: PostMeta[];
  reason: ContentReason;
  className?: string;
};

function emptyCopy(reason: ContentReason) {
  if (reason === "not-configured") {
    return {
      title: "还没有接通内容源。",
      sub: "配置仓库后，这里会显示最近的文章。",
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

export default function RecentPosts({ items, reason, className = "" }: Props) {
  const empty = items.length === 0;
  const copy = emptyCopy(reason);

  return (
    <section className={`mt-14 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-5">
        <h2 className="font-serif text-[21px] font-semibold tracking-[0.04em]">
          最近在写
        </h2>
        {!empty && (
          <Link
            href="/study"
            className="group inline-flex items-center gap-[7px] text-[13px] text-ink-3 transition-colors duration-150 hover:text-accent"
          >
            全部文章
            <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {empty ? (
        <div className="py-12 text-center">
          <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{copy.title}</p>
          <p className="text-[13px] text-ink-3">{copy.sub}</p>
        </div>
      ) : (
        <ul className="mt-2.5">
          {items.map((post) => (
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
      )}
    </section>
  );
}
