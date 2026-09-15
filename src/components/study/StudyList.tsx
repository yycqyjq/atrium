"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import type { PostMeta } from "@/lib/content";

/**
 * 书房列表 + 即时搜索（客户端内存过滤）。
 * 服务端只负责取数据；过滤、快捷键全在本地，无网络请求。
 */
export default function StudyList({ posts }: { posts: PostMeta[] }) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () =>
      posts.map((p) => ({
        href: `/study/${encodeURIComponent(p.slug)}`,
        title: p.title,
        sub: p.description,
        extra: [p.category, p.tags.join(" ")].filter(Boolean).join(" "),
        month: p.lastModified,
      })),
    [posts],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => [item.title, item.sub ?? "", item.extra].some((t) => t.toLowerCase().includes(q)))
    : items;

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索文章、标签、目录…" />

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <p className="mb-2 font-serif text-[17px] tracking-[0.02em]">没有找到「{query.trim()}」。</p>
          <p className="text-[13px] text-ink-3">换个词试试，或者去写作台写一篇。</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="group block py-4">
                <p className="mb-1 flex items-baseline justify-between gap-4">
                  <span className="font-medium tracking-[0.01em] transition-colors duration-150 group-hover:text-accent">
                    {item.title}
                  </span>
                  {item.extra ? (
                    <span className="shrink-0 text-[11.5px] tracking-[0.06em] text-ink-3">{item.extra}</span>
                  ) : null}
                </p>
                {item.sub ? <p className="line-clamp-1 text-[13px] text-ink-2">{item.sub}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">
        {q ? `${filtered.length} / ${items.length} 篇` : `共 ${items.length} 篇`}
      </p>
    </>
  );
}
