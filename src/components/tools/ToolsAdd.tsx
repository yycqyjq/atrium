"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Field";
import { IconPlus, IconX } from "@/components/icons";

/**
 * 添加工具：头部入口 + 弹层表单（提交后写入仓库 admin/tools.json）。
 * category 支持从现有分类中选择或输入新分类。
 */
export default function ToolsAdd({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = useCallback(() => {
    setOpen(false);
    setState("idle");
    setMessage("");
  }, []);

  // Esc 关闭 + 锁定页面滚动
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const canSave = name.trim() !== "" && /^https?:\/\//i.test(url.trim()) && state !== "saving";

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          description: description.trim(),
          category: category.trim() || "未分类",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "添加失败，请稍后再试");
        return;
      }
      setState("ok");
      setMessage(`「${name.trim()}」已加入清单。`);
      setName("");
      setUrl("https://");
      setDescription("");
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  return (
    <>
      <Button
        variant="text"
        className="group"
        onClick={() => {
          setOpen(true);
          setMessage("");
          setState("idle");
        }}
      >
        添加工具
        <IconPlus className="size-[13px] transition-transform duration-200 group-hover:rotate-90" />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-12 backdrop-blur-[2px]"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="添加工具"
            className="w-full max-w-[560px] animate-rise rounded-ctl border border-line bg-raised p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="font-serif text-[17px] tracking-[0.02em]">添加工具</p>
              <button
                type="button"
                aria-label="关闭"
                onClick={close}
                className="rounded-full p-1.5 text-ink-3 ring-1 ring-line transition-colors duration-150 hover:bg-wash hover:text-ink"
              >
                <IconX strokeWidth={1.8} className="size-4" />
              </button>
            </div>

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
                <Input
                  id="tool-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="tool-cat-list"
                  placeholder="输入或选择分类"
                />
                <datalist id="tool-cat-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {state === "error" || state === "ok" ? (
              <p className={`mt-3 text-[12.5px] ${state === "error" ? "text-accent-ink" : "text-ink-2"}`}>{message}</p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={save} disabled={!canSave}>
                {state === "saving" ? "保存中…" : "保存到清单"}
              </Button>
              <Button variant="quiet" size="sm" onClick={close}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
