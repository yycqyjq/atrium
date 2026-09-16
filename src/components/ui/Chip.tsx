import Link from "next/link";

/** 胶囊标签：用于相册导航等筛选场景（active 高亮）。 */
export default function Chip({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-ctl border px-[13px] py-[5px] text-[12.5px] tracking-[0.03em] transition-colors duration-150 ${
        active
          ? "border-accent bg-accent-soft font-medium text-accent-ink"
          : "border-line text-ink-3 hover:border-line-strong hover:text-ink-2"
      }`}
    >
      {children}
    </Link>
  );
}
