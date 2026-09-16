"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "ok" | "error";
export type ToastState = { text: string; tone: ToastTone } | null;

/** 轻提示（全站统一）：底部浮出、3.2 秒自动消失；ok / error 两种语气。 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | null>(null);

  const showToast = useCallback((text: string, tone: ToastTone = "ok") => {
    setToast({ text, tone });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const tone = toast.tone ?? "ok";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-7 z-[70] flex justify-center">
      <div
        className={`animate-rise rounded-ctl border bg-raised px-4 py-2.5 text-[13px] shadow-lg ${
          tone === "error" ? "border-accent text-accent-ink" : "border-line text-ink"
        }`}
      >
        {toast.text}
      </div>
    </div>
  );
}
