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

/** 工具房列表 + 即时搜索 + 书签删除（可写环境下显示） */
export default function ToolsList({ groups, canWrite = false }: { groups: ToolGroup[]; canWrite?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

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
          {filtered.map((group) => (
            <section key={group.name} className="mb-10">
              <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
                <h2 className="font-serif text-[17px] tracking-[0.02em]">{group.name}</h2>
                <span className="text-[12px] text-ink-3">{group.items.length} 个</span>
              </div>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((tool) => {
                  const key = `${tool.name}|${tool.url}`;
                  return (
                    <li key={`${tool.category}/${tool.name}`}>
                      {confirmDelete === key ? (
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
                        {canWrite ? (
                          <button
                            type="button"
                            aria-label={`删除 ${tool.name}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setConfirmDelete(key);
                            }}
                            className="absolute right-2 top-2 rounded p-1 text-ink-3 opacity-0 transition-all duration-150 hover:bg-wash hover:text-accent group-hover:opacity-100"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-3.5">
                              <path d="M6 6 L18 18 M18 6 L6 18" />
                            </svg>
                          </button>
                        ) : null}
                        <span className="mb-0.5 flex items-start justify-between gap-3">
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
                        <span className="block text-[12px] tracking-[0.03em] text-ink-3">{hostOf(tool.url)}</span>
                        {tool.description ? (
                          <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-2">
                            {tool.description}
                          </span>
                        ) : null}
                      </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-[12.5px] tracking-[0.05em] text-ink-3">
            {q ? `${total} / ${groups.reduce((n, g) => n + g.items.length, 0)} 个工具` : `共 ${total} 个工具`}
          </p>
        </>
      )}
    </>
  );
}
