"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

/**
 * 添加工具：内联表单，提交后写入仓库 admin/tools.json。
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
          category: (category.trim() || "未分类"),
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

  if (!open) {
    return (
      <Button variant="text" className="group" onClick={() => setOpen(true)}>
        添加工具
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
          className="size-[13px] transition-transform duration-200 group-hover:rotate-90"
        >
          <path d="M12 5 V19 M5 12 H19" />
        </svg>
      </Button>
    );
  }

  const field = "w-full rounded-ctl border border-line bg-raised px-3.5 py-2 text-[13px] outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent";
  const label = "mb-1 block text-[11px] tracking-[0.1em] text-ink-3";

  return (
    <div className="mb-8 rounded-ctl border border-line bg-raised p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-serif text-[15px] tracking-[0.02em]">添加工具</p>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setOpen(false);
            setState("idle");
            setMessage("");
          }}
        >
          收起
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor="tool-name">名称 *</label>
          <input id="tool-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="工具名称" />
        </div>
        <div>
          <label className={label} htmlFor="tool-url">地址 *</label>
          <input id="tool-url" className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className={label} htmlFor="tool-desc">描述</label>
          <input id="tool-desc" className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话说明（可选）" />
        </div>
        <div>
          <label className={label} htmlFor="tool-cat">分类</label>
          <input
            id="tool-cat"
            className={field}
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

      <Button className="mt-4" onClick={save} disabled={!canSave}>
        {state === "saving" ? "保存中…" : "保存到清单"}
      </Button>
    </div>
  );
}
