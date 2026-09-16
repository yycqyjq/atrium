"use client";

import type { ReactNode } from "react";

export type CardAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

/**
 * 卡片操作角标（全站统一配置）：
 * 悬停卡片时在右下角浮出（float，带底盘）或在行内淡入（plain）；
 * 点击不会触发卡片本身的跳转/打开行为，键盘聚焦（focus-within）也可见。
 * 后续任何卡片（工具 / 图片 / 展品…）只需传入 actions 数组即可获得同一套交互。
 */
export default function CardActions({
  actions,
  variant = "float",
  className = "",
}: {
  actions: CardAction[];
  variant?: "float" | "plain";
  className?: string;
}) {
  if (actions.length === 0) return null;
  const shell =
    variant === "float"
      ? "absolute bottom-2 right-2 z-10 gap-0.5 rounded-lg border border-line bg-raised/95 p-0.5 shadow-sm backdrop-blur-sm"
      : "gap-0.5";
  return (
    <span
      className={`flex shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${shell} ${className}`}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          aria-label={action.label}
          title={action.label}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onClick();
          }}
          className="rounded-md p-1.5 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-accent"
        >
          {action.icon}
        </button>
      ))}
    </span>
  );
}
