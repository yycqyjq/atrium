"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button, { ButtonLink } from "@/components/ui/Button";

type WriteState = "edit" | "saving" | "saved" | "error";

/** 文件名自动识别：标题去掉路径不安全字符后即为文件名 */
export function fileNameFromTitle(title: string): string {
  return title
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 书房写作台：新建 / 更新文章，直接发布到内容仓库。
 * - 文件名自动取标题（不再手填）；
 * - 新文章可选填「参考资源（每行一个）」，保存时按旧版格式附加到正文尾部；
 * - 编辑模式沿用原文，参考资源在正文中原文保留。
 */
export default function WriteDesk({
  initial,
}: {
  initial?: { slug: string; title: string; body: string; refs?: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [refs, setRefs] = useState(initial?.refs ?? "");
  const [state, setState] = useState<WriteState>("edit");
  const [message, setMessage] = useState("");
  const [savedSlug, setSavedSlug] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = Boolean(initial?.slug);
  const autoSlug = initial?.slug ?? fileNameFromTitle(title);
  const canSave = title.trim() !== "" && body.trim() !== "" && state !== "saving";

  async function save() {
    setState("saving");
    setMessage("");
    try {
      // 参考资源：新建/编辑统一——按旧版格式附加到正文尾部（清空则移除该段）
      const refLines = refs
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const base = body.replace(/^\s+/, "").replace(/\s+$/, "");
      const finalBody =
        refLines.length > 0
          ? `${base}\n\n---\n\n**参考资源**：\n${refLines.map((l) => `- ${l}`).join("\n")}`
          : base;

      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: autoSlug,
          title: title.trim(),
          body: finalBody,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; path?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "发布失败，请稍后再试");
        return;
      }
      setState("saved");
      setMessage(`已发布到仓库：${data.path}`);
      setSavedSlug(autoSlug);
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  async function remove() {
    if (!initial?.slug) return;
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/write?slug=${encodeURIComponent(initial.slug)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "删除失败，请稍后再试");
        setConfirmDelete(false);
        setDeleting(false);
        return;
      }
      setState("saved");
      setMessage(`已从仓库移除：${initial.slug}.md`);
      setSavedSlug("");
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const field =
    "w-full rounded-ctl border border-line bg-raised px-3.5 py-2.5 text-[13.5px] outline-none transition-colors duration-150 placeholder:text-ink-3 hover:border-line-strong focus:border-accent";
  const label = "mb-1.5 block text-[11.5px] tracking-[0.1em] text-ink-3";

  if (state === "saved") {
    return (
      <div className="rounded-ctl border border-accent bg-accent-soft px-6 py-10 text-center">
        <p className="mb-2 font-serif text-[19px] tracking-[0.02em] text-accent-ink">
          {savedSlug ? "文章已存入仓库。" : "文章已从仓库移除。"}
        </p>
        <p className="mb-6 text-[13px] text-ink-2">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {savedSlug ? (
            <ButtonLink href={`/study/${encodeURIComponent(savedSlug)}`}>去书房看这篇</ButtonLink>
          ) : (
            <ButtonLink href="/study">回到书房</ButtonLink>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setState("edit");
              setSavedSlug("");
            }}
          >
            继续写
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-ctl border border-line bg-raised p-5 md:p-6">
      <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3">
        {isEdit
          ? `正在编辑：${initial?.slug}.md（标题与文件名已自动识别；参考资源已提取，可在此修改）`
          : "新文章以 Markdown 存入内容仓库，文件名自动取标题。"}
      </p>

      <div className="mb-4">
        <label className={label} htmlFor="write-title">标题 *</label>
        <input
          id="write-title"
          className={field}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
        />
        <p className="mt-1.5 text-[11.5px] tracking-[0.03em] text-ink-3">
          文件名：
          {isEdit
            ? `${autoSlug.split("/").pop() ?? autoSlug}.md（保持原文件名）`
            : autoSlug
              ? `${autoSlug}.md`
              : "（随标题自动生成）"}
        </p>
      </div>

      <div className="mb-4">
        <label className={label} htmlFor="write-body">正文（Markdown）*</label>
        <textarea
          id="write-body"
          className={`${field} min-h-[380px] resize-y font-mono text-[13px] leading-relaxed`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"## 小标题\n\n正文…"}
        />
      </div>

      <div className="mb-5">
        <label className={label} htmlFor="write-refs">参考资源（每行一个，可选）</label>
        <textarea
          id="write-refs"
          className={`${field} min-h-[84px] resize-y font-mono text-[13px] leading-relaxed`}
          value={refs}
          onChange={(e) => setRefs(e.target.value)}
          placeholder={"https://example.com\n[标题](https://example.com)"}
        />
      </div>

      {state === "error" ? (
        <p className="mb-4 rounded-ctl border border-accent bg-accent-soft px-4 py-2.5 text-[13px] text-accent-ink">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!canSave}>
          {state === "saving" ? "发布中…" : "发布到仓库"}
        </Button>
        <span className="text-[12px] text-ink-3">以你的名义提交到 GitHub，可在仓库历史里回溯</span>

        {isEdit ? (
          confirmDelete ? (
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="text-[12px] text-ink-2">确定删除这篇？此操作会从仓库移除文件。</span>
              <Button variant="danger" size="sm" onClick={remove} disabled={deleting}>
                {deleting ? "删除中…" : "确认删除"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                取消
              </Button>
            </span>
          ) : (
            <Button
              variant="quiet"
              size="sm"
              className="ml-auto underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent/50"
              onClick={() => setConfirmDelete(true)}
            >
              删除这篇文章
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
