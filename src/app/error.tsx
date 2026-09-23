"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

/** 路由级错误边界：出错不白屏，可重试或回门厅 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-24 text-center">
      <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">页面出了点问题。</p>
      <p className="mb-7 text-[13px] text-ink-3">{error.message || "未知错误，刷新或稍后再试。"}</p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset}>再试一次</Button>
        <Link
          href="/"
          className="text-[13px] text-ink-3 underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-accent"
        >
          回到门厅
        </Link>
      </div>
    </div>
  );
}
