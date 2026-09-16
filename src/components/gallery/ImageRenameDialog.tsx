"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Field";
import { Toast, useToast } from "@/components/ui/Toast";
import type { GalleryImage } from "@/lib/gallery";

/**
 * 画廊重命名弹层：与工具弹层同壳（Modal），单字段修改文件名。
 * onSubmit 抛错时在弹层内展示错误；成功后收起并浮出确认提示。
 */
export default function ImageRenameDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: GalleryImage | null;
  onClose: () => void;
  /** 提交改名；返回最终文件名（含后缀），失败时抛出带消息的错误 */
  onSubmit: (origin: GalleryImage, nextName: string) => Promise<string>;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!open || !initial) return;
    setDraft(initial.name);
    setSaving(false);
    setError(null);
  }, [open, initial]);

  const save = async () => {
    if (!initial || saving) return;
    const next = draft.trim();
    if (!next) {
      setError("名字不能为空");
      return;
    }
    if (next === initial.name) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const finalName = await onSubmit(initial, next);
      showToast(`「${finalName}」已重命名。`);
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "改名失败，请稍后再试");
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="重命名图片" width="max-w-[480px]">
        <FieldLabel htmlFor="gallery-rename-input">文件名</FieldLabel>
        <Input
          id="gallery-rename-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          autoFocus
          placeholder="新的文件名"
        />
        <p className="mt-2 text-[12px] text-ink-3">不带扩展名时会沿用原后缀；同名文件会被拦截。</p>
        {error ? <p className="mt-3 text-[12.5px] text-accent-ink">{error}</p> : null}
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save} disabled={saving || !draft.trim()}>
            {saving ? "保存中…" : "保存修改"}
          </Button>
          <Button variant="quiet" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
