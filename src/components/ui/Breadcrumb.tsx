import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** 面包屑：中庭 / 段1 / 段2 …（中间段可点击，末段弱墨色） */
export default function Breadcrumb({
  items,
  className = "",
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-center gap-x-1 text-[12.5px] tracking-[0.1em] text-ink-3 ${className}`}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-x-1">
          {i > 0 ? <span> / </span> : null}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="transition-colors duration-150 hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? "text-ink-2" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </p>
  );
}
