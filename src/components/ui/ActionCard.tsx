"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import CardActions, { type CardAction } from "@/components/ui/CardActions";

/**
 * 操作卡片外壳（全站统一）：
 * 卡片 + 悬停右下角操作（CardActions）+ 原位确认浮层（尺寸与卡片完全一致，零跳变）。
 * 工具房与画廊同款；后续新卡片直接复用即可获得一致交互。
 */
export default function ActionCard({
  actions,
  confirming = false,
  confirmText,
  confirmLabel = "确认移除",
  onConfirm,
  onCancelConfirm,
  className = "",
  children,
}: {
  actions: CardAction[];
  confirming?: boolean;
  confirmText?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancelConfirm?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`group relative ${className}`}>
      {children}
      {actions.length > 0 && !confirming ? <CardActions actions={actions} /> : null}
      {confirming ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 rounded-ctl border border-line-strong bg-raised/95 px-4 text-center backdrop-blur-[1px]">
          {confirmText ? (
            <p className="text-[12.5px] leading-relaxed text-ink-2">{confirmText}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelConfirm}>
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
