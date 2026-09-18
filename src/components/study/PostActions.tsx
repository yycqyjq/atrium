"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Toast, useToast } from "@/components/ui/Toast";

/**
 * 文章行的快捷操作：编辑（跳写作台）+ 删除（走 /api/write）。
 * 只在悬停 / 键盘聚焦时由 PostRow 显示，平时让位给日期。
 * 删除先过 ConfirmDialog 二次确认；成功后 router.refresh() —— 服务端缓存已在写接口里失效。
 */
export default function PostActions({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast } = useToast();

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/write?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        // 失败时保留弹窗，让用户看着提示决定重试还是取消
        showToast(data.error ?? "删除失败，请稍后再试", "error");
        return;
      }
      setAsking(false);
      showToast(`已删除《${title}》`);
      router.refresh();
    } catch {
      showToast("网络异常，请稍后再试", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Link
        href={`/study/write?edit=${encodeURIComponent(slug)}`}
        className="text-[12px] text-ink-3 transition-colors duration-150 hover:text-accent"
      >
        编辑
      </Link>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-[12px] text-ink-3 transition-colors duration-150 hover:text-accent hover:underline underline-offset-4"
      >
        删除
      </button>

      <ConfirmDialog
        open={asking}
        title="删除这篇文章？"
        description={<>《{title}》会从仓库移除。文件仍可在仓库历史里找回。</>}
        confirmText="删除"
        tone="danger"
        busy={deleting}
        onConfirm={remove}
        onClose={() => setAsking(false)}
      />
      <Toast toast={toast} />
    </>
  );
}
