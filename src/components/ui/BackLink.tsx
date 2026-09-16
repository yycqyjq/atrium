import Link from "next/link";
import { IconArrowRight } from "@/components/icons";

/** 返回链接：← 回到某处（图标 + 文本，悬停位移）。 */
export default function BackLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-[13px] text-ink-3 transition-colors duration-150 hover:text-accent ${className}`}
    >
      <IconArrowRight className="h-3.5 w-3.5 -scale-x-100 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}
