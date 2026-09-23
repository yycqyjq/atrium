/**
 * 载入态（全站统一）：轻量旋转圈 + 文案。
 * 用于路由切换兜底（app/loading.tsx）、索引/数据等待等场景。
 */
export default function Loading({
  label = "载入中…",
  size = "md",
  className = "",
}: {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-3 text-ink-3 ${className}`}
    >
      <span
        aria-hidden
        className={`animate-spin rounded-full border-2 border-line-strong border-t-accent ${
          size === "sm" ? "size-4" : "size-5"
        }`}
      />
      <span className={`tracking-[0.12em] ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>
        {label}
      </span>
    </div>
  );
}
