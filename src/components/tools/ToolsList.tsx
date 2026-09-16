"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import type { ToolGroup } from "@/lib/tools";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 站点图标：服务端代理（/api/icon，带磁盘缓存）；失败回退首字方块 */
function ToolIcon({ host, name }: { host: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !host) {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-wash font-serif text-[11px] leading-none text-ink-2"
      >
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/icon?d=${encodeURIComponent(host)}`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
      data-tool-icon
      onError={() => setFailed(true)}
      className="size-5 shrink-0 rounded-[5px]"
    />
  );
}

/** 工具房列表 + 即时搜索 + 书签删除（可写环境下显示） */
export default function ToolsList({ groups, canWrite = false }: { groups: ToolGroup[]; canWrite?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editTool, setEditTool] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", url: "", description: "", category: "" });

  async function saveEdit() {
    const res = await fetch("/api/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tool", ...editForm }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setNotice({ kind: "error", text: data.error ?? "保存失败" });
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setEditTool(null);
    setNotice({ kind: "ok", text: `已更新「${editForm.name}」` });
    setTimeout(() => setNotice(null), 3000);
    router.refresh();
  }

  async function renameCategory() {
    const oldName = editCategory ?? "";
    const res = await fetch("/api/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "category", oldName, name: categoryName.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setNotice({ kind: "error", text: data.error ?? "重命名失败" });
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setEditCategory(null);
    setNotice({ kind: "ok", text: `分类已重命名为「${categoryName.trim()}」` });
    setTimeout(() => setNotice(null), 3000);
    router.refresh();
  }

  async function remove(name: string, url: string) {
    const key = `${name}|${url}`;
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/tools?name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setNotice({ kind: "error", text: data.error ?? "删除失败" });
        return;
      }
      setNotice({ kind: "ok", text: `已移除「${name}」` });
      routerRefresh();
    } catch {
      setNotice({ kind: "error", text: "网络异常" });
    }
    setTimeout(() => setNotice(null), 3000);
  }

  function routerRefresh() {
    // Next.js 客户端组件内刷新当前路由
    router.refresh();

  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((tool) =>
          [tool.name, tool.description, tool.url].some((text) => text.toLowerCase().includes(q)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, q]);

  const total = filtered.reduce((n, group) => n + group.items.length, 0);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索工具、描述、域名…" />

      {notice ? (
        <p
          className={`mb-4 rounded-ctl border px-4 py-2 text-[12.5px] ${
            notice.kind === "error"
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line bg-raised text-ink-2"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {total === 0 ? (
        <div className="py-14 text-center">
          <p className="mb-2 font-serif text-[17px] tracking-[0.02em]">没有找到「{query.trim()}」。</p>
          <p className="text-[13px] text-ink-3">换个词试试，或把新工具加进仓库的清单里。</p>
        </div>
      ) : (
        <>
          {filtered.map((group) => {
            return (
            <section key={group.name} className="mb-10">
              <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
                <h2 id={`cat-${group.name}`} className="scroll-mt-8 font-serif text-[17px] tracking-[0.02em]">{group.name}</h2>
                <span className="text-[12px] text-ink-3">{group.items.length} 个</span>
              </div>
              <ul className="gap-3 md:columns-2 xl:columns-3">
                {group.items.map((tool) => {
                  const key = `${tool.name}|${tool.url}`;
                  return (
                    <li key={`${tool.category}/${tool.name}`} className="mb-3 break-inside-avoid">
                      {editTool === key ? (
                        <div className="rounded-ctl border border-accent bg-accent-soft px-4 py-3.5">
                          <p className="mb-2 text-[12px] tracking-[0.08em] text-accent-ink">编辑工具</p>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="mb-2 w-full rounded-ctl border border-line bg-raised px-3 py-1.5 text-[13px] outline-none focus:border-accent"
                            placeholder="名称"
                          />
                          <input
                            value={editForm.url}
                            onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                            className="mb-2 w-full rounded-ctl border border-line bg-raised px-3 py-1.5 text-[12.5px] outline-none focus:border-accent"
                            placeholder="地址"
                          />
                          <input
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            className="mb-2 w-full rounded-ctl border border-line bg-raised px-3 py-1.5 text-[12.5px] outline-none focus:border-accent"
                            placeholder="描述"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="rounded-ctl bg-accent px-3 py-1.5 text-[12px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTool(null)}
                              className="rounded-ctl border border-line px-3 py-1.5 text-[12px] text-ink-3 transition-colors duration-150 hover:border-line-strong"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : confirmDelete === key ? (
                        <div className="rounded-ctl border border-accent bg-accent-soft px-4 py-3.5">
                          <p className="mb-2.5 text-[12.5px] leading-relaxed text-accent-ink">
                            从清单移除「{tool.name}」？
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => remove(tool.name, tool.url)}
                              className="rounded-ctl bg-accent px-3 py-1.5 text-[12px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover"
                            >
                              确认移除
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-ctl border border-line px-3 py-1.5 text-[12px] text-ink-3 transition-colors duration-150 hover:border-line-strong"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                      >
                        {canWrite && confirmDelete !== key ? (
                          <span className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label={`编辑 ${tool.name}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setEditForm({ name: tool.name, url: tool.url, description: tool.description, category: tool.category });
                                setEditTool(key);
                                setConfirmDelete(null);
                              }}
                              className="rounded p-1 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-accent"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                                <path d="M4 20 H8 L19 9 C19.8 8.2 19.8 7 19 6.2 L17.8 5 C17 4.2 15.8 4.2 15 5 L4 16 Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label={`删除 ${tool.name}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setConfirmDelete(key);
                                setEditTool(null);
                              }}
                              className="rounded p-1 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-accent"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-3.5">
                                <path d="M6 6 L18 18 M18 6 L6 18" />
                              </svg>
                            </button>
                          </span>
                        ) : null}
                        <span className="flex items-start gap-2.5">
                          <ToolIcon host={hostOf(tool.url)} name={tool.name} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
                                {tool.name}
                              </span>
                              {!(canWrite) ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                className="mt-0.5 size-[13px] shrink-0 text-ink-3 transition-colors duration-200 group-hover:text-accent"
                              >
                                <path d="M7 17 L17 7" />
                                <path d="M9 7 H17 V15" />
                              </svg>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-[12px] tracking-[0.03em] text-ink-3">{hostOf(tool.url)}</span>
                            <span className="mt-1.5 line-clamp-3 block text-[13px] leading-relaxed text-ink-2">
                              {tool.description}
                            </span>
                          </span>
                        </span>
                      </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );})}

          <p className="text-[12.5px] tracking-[0.05em] text-ink-3">
            {q ? `${total} / ${groups.reduce((n, g) => n + g.items.length, 0)} 个工具` : `共 ${total} 个工具`}
          </p>
        </>
      )}
    </>
  );
}
