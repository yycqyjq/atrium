"use client";

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

/** 工具房列表 + 即时搜索（标题/描述/域名，纯客户端过滤） */
export default function ToolsList({ groups }: { groups: ToolGroup[] }) {
  const [query, setQuery] = useState("");

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
                {group.items.map((tool) => (
                  <li key={`${tool.category}/${tool.name}`}>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                    >
                      <span className="mb-0.5 flex items-start justify-between gap-3">
                        <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
                          {tool.name}
                        </span>
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
                      </span>
                      <span className="block text-[12px] tracking-[0.03em] text-ink-3">{hostOf(tool.url)}</span>
                      {tool.description ? (
                        <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-2">
                          {tool.description}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
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
