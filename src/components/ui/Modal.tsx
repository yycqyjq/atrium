"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/icons";

/**
 * 弹层外壳（全站统一）：遮罩 + 居中面板 + 标题栏 + Esc/背板关闭 + 滚动锁定。
 * 内容区由使用方填充（表单、字段等）；工具弹层、画廊改名弹层、二次确认弹窗共用。
 * 用 Portal 挂到 body：既不受调用处 DOM 结构限制（可以在 span / 行内元素里使用），
 * 也避免被祖先的定位或溢出裁剪影响。
 */
export default function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  width = "max-w-[560px]",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  width?: string;
  children: React.ReactNode;
}) {
  // Portal 只能在客户端挂载后使用；SSR 期间先不渲染，避免 document 未定义
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-8 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={`max-h-[calc(100dvh-80px)] w-full ${width} animate-rise overflow-y-auto rounded-ctl border border-line bg-raised p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-serif text-[17px] tracking-[0.02em]">{title}</p>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-3 ring-1 ring-line transition-colors duration-150 hover:bg-wash hover:text-ink"
          >
            <IconX strokeWidth={1.8} className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
