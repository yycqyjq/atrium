"use client";

import { useCallback, useEffect, useRef } from "react";
import { buttonClasses } from "./Button";
import Modal from "./Modal";

/**
 * 二次确认弹窗（全站统一）：替代原生 window.confirm。
 * 基于 Modal，提供「取消 / 确认」两键 + 危险语气 + 进行中锁定。
 * - tone="danger"：确认键走 danger 样式（浅强调底 → 悬停实底），且打开时焦点落在「取消」上，防误触
 * - busy：确认进行中，两键禁用并屏蔽 Esc / 背板关闭，避免关掉后调用方状态错乱
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 打开时把焦点放好：危险操作先落在「取消」上，其余落在「确认」上
  useEffect(() => {
    if (!open || busy) return;
    const target = tone === "danger" ? cancelRef.current : confirmRef.current;
    target?.focus();
  }, [open, busy, tone]);

  // 保持引用稳定：Modal 的 Esc 监听依赖 onClose，函数每次新建会导致监听反复挂载
  const handleClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  return (
    <Modal open={open} onClose={handleClose} title={title} width="max-w-[420px]">
      {description ? (
        <div className="mb-6 text-[13.5px] leading-[1.75] text-ink-2">{description}</div>
      ) : null}
      <div className="flex items-center justify-end gap-2.5">
        <button
          ref={cancelRef}
          type="button"
          disabled={busy}
          onClick={onClose}
          className={buttonClasses("secondary", "sm")}
        >
          {cancelText}
        </button>
        <button
          ref={confirmRef}
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={buttonClasses(tone === "danger" ? "danger" : "primary", "sm")}
        >
          {busy ? "处理中…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
