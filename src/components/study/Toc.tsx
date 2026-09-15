"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/toc";

export default function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleIds.current.add(entry.target.id);
          else visibleIds.current.delete(entry.target.id);
        }
        // 取文档顺序中第一个可见的标题
        const first = items.find((item) => visibleIds.current.has(item.id));
        if (first) setActiveId(first.id);
      },
      { rootMargin: "-72px 0px -68% 0px", threshold: 0 },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="文章目录"
      className="sticky top-10 max-h-[72vh] overflow-y-auto pb-8 text-[13px]"
    >
      <p className="mb-3 text-[12.5px] tracking-[0.14em] text-ink-3">目录</p>
      <ul className="border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`-ml-px block border-l py-[4px] leading-[1.6] transition-colors duration-150 ${
                item.depth === 1 ? "pl-3" : item.depth === 2 ? "pl-6" : "pl-9"
              } ${
                activeId === item.id
                  ? "border-accent bg-accent-soft font-medium text-accent-ink"
                  : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
