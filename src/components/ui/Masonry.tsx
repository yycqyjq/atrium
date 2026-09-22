import type { ReactNode } from "react";

/**
 * 瀑布流容器（纯 CSS 多栏实现，零依赖）：
 * 子项按列排布、自动填高；列数由使用方控制（可配状态切换）。
 *
 * 约定：直接子元素建议加 `break-inside-avoid`（Tailwind 类），
 * 防止单个卡片被跨栏截断。
 */
export function Masonry({
  columns = 3,
  gap = 12,
  className = "",
  children,
}: {
  columns?: number;
  /** 列间距（px） */
  gap?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} style={{ columnCount: columns, columnGap: gap }}>
      {children}
    </div>
  );
}
