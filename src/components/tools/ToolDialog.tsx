"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Field";
import Combobox from "@/components/ui/Combobox";
import Modal from "@/components/ui/Modal";
import { Toast, useToast } from "@/components/ui/Toast";

export type ToolFormValue = { name: string; url: string; description: string; category: string };

/**
 * 工具弹层：添加与编辑共用同一套弹窗（经公共 Modal 外壳，与画廊改名弹层同款）。
 * - mode="add"：提交 POST /api/tools
 * - mode="edit"：提交 PATCH /api/tools（以 initial 的 name/url 定位原条目）
 * 成功后收起弹层，并在页面底部浮出确认提示。
 */
export default function ToolDialog({
  open,
  mode,
  categories,
  initial,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  categories: string[];
  initial?: ToolFormValue | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const { toast, showToast } = useToast();

  // 打开时按模式初始化表单
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setName(initial.name);
      setUrl(initial.url);
      setDescription(initial.description);
      setCategory(initial.category);
    } else {
      setName("");
      setUrl("https://");
      setDescription("");
      setCategory(categories[0] ?? "");
    }
    setState("idle");
    setMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const close = useCallback(() => {
    setState("idle");
    setMessage("");
    onClose();
  }, [onClose]);

  const canSave = name.trim() !== "" && /^https?:\/\//i.test(url.trim()) && state !== "saving";

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const payload =
        mode === "edit" && initial
          ? {
              kind: "tool",
              oldName: initial.name,
              oldUrl: initial.url,
              name: name.trim(),
              url: url.trim(),
              description: description.trim(),
              category: category.trim() || "未分类",
            }
          : {
              name: name.trim(),
              url: url.trim(),
              description: description.trim(),
              category: category.trim() || "未分类",
            };
      const res = await fetch("/api/tools", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "保存失败，请稍后再试");
        return;
      }
      const finalName = name.trim();
      showToast(mode === "edit" ? `「${finalName}」已更新。` : `「${finalName}」已加入清单。`);
      close();
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={mode === "edit" ? "编辑工具" : "添加工具"}
        ariaLabel={mode === "edit" ? "编辑工具" : "添加工具"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="tool-name">名称 *</FieldLabel>
            <Input id="tool-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="工具名称" autoFocus />
          </div>
          <div>
            <FieldLabel htmlFor="tool-url">地址 *</FieldLabel>
            <Input id="tool-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </div>
          <div>
            <FieldLabel htmlFor="tool-desc">描述</FieldLabel>
            <Input id="tool-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话说明（可选）" />
          </div>
          <div>
            <FieldLabel htmlFor="tool-cat">分类</FieldLabel>
            <Combobox
              id="tool-cat"
              value={category}
              onChange={setCategory}
              options={categories}
              placeholder="输入或选择分类"
            />
          </div>
        </div>

        {state === "error" ? <p className="mt-3 text-[12.5px] text-accent-ink">{message}</p> : null}

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save} disabled={!canSave}>
            {state === "saving" ? "保存中…" : mode === "edit" ? "保存修改" : "保存到清单"}
          </Button>
          <Button variant="quiet" size="sm" onClick={close}>
            关闭
          </Button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
