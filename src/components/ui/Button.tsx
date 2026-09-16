import Link from "next/link";

type Variant = "primary" | "secondary" | "danger" | "text" | "quiet";
type Size = "md" | "sm";

/**
 * 按钮样式函数：供 Button / ButtonLink 共用，也可在特殊场景直接拼类名。
 * - primary：主要操作（强调底）
 * - secondary：次要操作（描边）
 * - danger：危险确认（浅强调底 → 悬停实底）
 * - text：文字按钮（主题色）
 * - quiet：静默文字按钮（弱色）
 */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = "") {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-ctl tracking-[0.02em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";
  const boxed = variant === "primary" || variant === "secondary" || variant === "danger";
  const sizeCls = boxed
    ? size === "sm"
      ? "px-3.5 py-1.5 text-[12.5px]"
      : "px-4 py-2 text-[13.5px]"
    : size === "sm"
      ? "text-[12px]"
      : "text-[12.5px]";
  const variants: Record<Variant, string> = {
    primary: "bg-accent font-medium text-on-accent hover:bg-accent-hover",
    secondary: "border border-line text-ink-2 hover:border-line-strong hover:text-ink",
    danger:
      "border border-accent bg-accent-soft font-medium text-accent-ink hover:bg-accent hover:text-on-accent",
    text: "text-accent hover:text-accent-hover hover:underline underline-offset-4",
    quiet: "text-ink-3 hover:text-ink-2 hover:underline underline-offset-4",
  };
  return `${base} ${sizeCls} ${variants[variant]} ${extra}`.trim();
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  href: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
