import Link from "next/link";

/**
 * 分组标题：衬线标题 + 细线 + 计数（+ 可选下钻链接）。
 * 书房目录分组、工具房分类等共用；h2 携带楼层目录所需锚点。
 */
export default function SectionHeading({
  title,
  count,
  href,
  id,
  floorTitle,
  muted = false,
  countInline = false,
  className = "",
}: {
  title: string;
  count?: string;
  href?: string;
  id?: string;
  floorTitle?: string;
  muted?: boolean;
  countInline?: boolean;
  className?: string;
}) {
  const heading = (
    <h2
      id={id}
      data-floor-title={floorTitle}
      className={`scroll-mt-8 font-serif text-[17px] tracking-[0.02em] ${
        muted ? "text-ink-2" : "text-ink"
      } ${href ? "transition-colors duration-150 group-hover:text-accent" : ""}`}
    >
      {title}
    </h2>
  );
  const countEl = count ? <span className="shrink-0 text-[12px] text-ink-3">{count}</span> : null;

  return (
    <div
      className={`flex items-baseline border-b border-line pb-3 ${
        countInline ? "gap-2.5" : "justify-between gap-4"
      } ${className}`}
    >
      {href ? (
        <>
          <Link href={href} className="group inline-flex min-w-0 items-baseline gap-2.5">
            {heading}
            {countEl}
          </Link>
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1.5 text-[12px] text-ink-3 transition-colors duration-150 hover:text-accent"
          >
            进入
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
            >
              <path d="M5 12 H19" />
              <path d="M13.5 6.5 L19 12 L13.5 17.5" />
            </svg>
          </Link>
        </>
      ) : (
        <>
          {heading}
          {countEl}
        </>
      )}
    </div>
  );
}
