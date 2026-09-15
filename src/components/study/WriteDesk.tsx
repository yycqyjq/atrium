"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type WriteState = "edit" | "saving" | "saved" | "error";

/**
 * 书房写作台：新建 / 更新文章，直接发布到内容仓库。
 * slug 为空时视为新建；编辑已有文章时由页面传入 slug 与初始内容。
 */
export default function WriteDesk({ initial }: { initial?: { slug: string; title: string; description: string; date: string; tags: string[]; body: string } }) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [state, setState] = useState<WriteState>("edit");
  const [message, setMessage] = useState("");
  const [savedSlug, setSavedSlug] = useState("");

  const isEdit = Boolean(initial?.slug);
  const canSave = title.trim() !== "" && body.trim() !== "" && state !== "saving";

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() || title.trim(),
          title: title.trim(),
          description: description.trim(),
          date: date.trim(),
          tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
          body,
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
      setSavedSlug(slug.trim() || title.trim());
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  const field = "w-full rounded-ctl border border-line bg-raised px-3.5 py-2.5 text-[13.5px] outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent";
  const label = "mb-1.5 block text-[11.5px] tracking-[0.1em] text-ink-3";

  if (state === "saved") {
    return (
      <div className="rounded-ctl border border-accent bg-accent-soft px-6 py-10 text-center">
        <p className="mb-2 font-serif text-[19px] tracking-[0.02em] text-accent-ink">文章已存入仓库。</p>
        <p className="mb-6 text-[13px] text-ink-2">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/study/${encodeURIComponent(savedSlug)}`}
            className="rounded-ctl bg-accent px-4 py-2 text-[13.5px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover"
          >
            去书房看这篇
          </Link>
          <button
            type="button"
            onClick={() => {
              setState("edit");
              setSavedSlug("");
            }}
            className="rounded-ctl border border-line px-4 py-2 text-[13.5px] text-ink-2 transition-colors duration-150 hover:border-line-strong"
          >
            继续写
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-ctl border border-line bg-raised p-5 md:p-6">
      <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3">
        {isEdit ? `正在编辑：${initial?.slug}.md` : "新文章会以 Markdown 存到内容仓库的根目录，与你的其他文章同级。"}
      </p>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor="write-title">标题 *</label>
          <input id="write-title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章标题" />
        </div>
        <div>
          <label className={label} htmlFor="write-slug">文件名 slug</label>
          <input id="write-slug" className={field} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="留空则用标题" disabled={isEdit} />
        </div>
        <div>
          <label className={label} htmlFor="write-desc">摘要</label>
          <input id="write-desc" className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话摘要（可选）" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="write-date">日期</label>
            <input id="write-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="write-tags">标签</label>
            <input id="write-tags" className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="用逗号分隔" />
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className={label} htmlFor="write-body">正文（Markdown）*</label>
        <textarea
          id="write-body"
          className={`${field} min-h-[380px] resize-y font-mono text-[13px] leading-relaxed`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"## 小标题\n\n正文…"}
        />
      </div>

      {state === "error" ? (
        <p className="mb-4 rounded-ctl border border-accent bg-accent-soft px-4 py-2.5 text-[13px] text-accent-ink">{message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-ctl bg-accent px-5 py-2.5 text-[13.5px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "saving" ? "发布中…" : "发布到仓库"}
        </button>
        <span className="text-[12px] text-ink-3">以你的名义提交到 GitHub，可在仓库历史里回溯</span>
      </div>
    </div>
  );
}
