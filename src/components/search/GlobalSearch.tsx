"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconExternal, IconSearch } from "@/components/icons";

type PostHit = { title: string; slug: string; category: string; dateLabel?: string };
type ToolHit = { name: string; url: string; description: string; category: string };
type ExhibitHit = {
  title: string;
  desc?: string;
  projectId: string;
  projectName: string;
  id: string;
  group?: string;
  origin?: string;
};
type IndexData = { posts: PostHit[]; tools: ToolHit[]; exhibits: ExhibitHit[] };

type Hit = {
  key: string;
  title: string;
  sub: string;
  href: string;
  external?: boolean;
};

const EMPTY: IndexData = { posts: [], tools: [], exhibits: [] };

/** 全局搜索命令面板：⌘K / Ctrl+K 或侧边栏入口唤起，搜文章、展品与书签 */
export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<IndexData | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  // 快捷键（⌘K 开关）与侧边栏入口事件
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return false;
          setQuery("");
          setActive(0);
          return true;
        });
      }
    };
    const onAsk = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("atrium:search", onAsk);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("atrium:search", onAsk);
    };
  }, []);

  // 空闲预取：页面加载后悄悄拉一次索引，首开面板时秒出
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!data && !loadingRef.current) {
        loadingRef.current = true;
        fetch("/api/search-index")
          .then((r) => r.json())
          .then((json: IndexData) => setData(json))
          .catch(() => {})
          .finally(() => {
            loadingRef.current = false;
          });
      }
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 打开时载入索引（一次）+ 锁滚动 + 聚焦输入
  useEffect(() => {
    if (!open) return;
    if (!data && !loadingRef.current) {
      loadingRef.current = true;
      fetch("/api/search-index")
        .then((r) => r.json())
        .then((json: IndexData) => setData(json))
        .catch(() => setData(EMPTY))
        .finally(() => {
          loadingRef.current = false;
        });
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
    };
  }, [open, data]);

  const hits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !data) return [];
    const posts: Hit[] = data.posts
      .filter((post) => `${post.title} ${post.category}`.toLowerCase().includes(q))
      .map((post) => ({
        key: `p:${post.slug}`,
        title: post.title,
        sub: `文章 · ${post.category || "根目录"}${post.dateLabel ? ` · ${post.dateLabel}` : ""}`,
        href: `/study/${encodeURI(post.slug)}`,
      }))
      .slice(0, 6);
    const exhibits: Hit[] = data.exhibits
      .filter((item) =>
        `${item.title} ${item.desc ?? ""} ${item.group ?? ""} ${item.projectName} ${item.origin ?? ""} ${item.id}`.toLowerCase().includes(q),
      )
      .map((item) => ({
        key: `e:${item.projectId}/${item.id}`,
        title: item.title,
        sub: `展品 · ${item.projectName}${item.group ? ` · ${item.group}` : ""}`,
        href: `/workshop/${item.projectId}/${item.id}`,
      }))
      .slice(0, 6);
    const tools: Hit[] = data.tools
      .filter((tool) => `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(q))
      .map((tool) => ({
        key: `t:${tool.name}|${tool.url}`,
        title: tool.name,
        sub: `书签 · ${tool.category}`,
        href: tool.url,
        external: true,
      }))
      .slice(0, 6);
    return [...posts, ...exhibits, ...tools];
  }, [data, query]);

  useEffect(() => setActive(0), [query]);

  // 键盘高亮滚动进视野
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (hit: Hit | undefined) => {
      if (!hit) return;
      setOpen(false);
      if (hit.external) {
        window.open(hit.href, "_blank", "noreferrer");
      } else {
        router.push(hit.href);
      }
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="w-full max-w-[560px] overflow-hidden rounded-ctl border border-line bg-surface"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <IconSearch className="size-4 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="搜索文章、展品、书签…"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
          <span className="shrink-0 rounded border border-line px-1.5 py-px text-[10.5px] text-ink-3">
            Esc
          </span>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto px-2 py-2">
          {!query.trim() ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">
              输入关键词，搜遍书房、工坊与工具房。
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">
              没有找到「{query.trim()}」。
            </p>
          ) : (
            <ul>
              {hits.map((hit, i) => (
                <li key={hit.key}>
                  <button
                    type="button"
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hit)}
                    className={`group flex w-full items-center justify-between gap-3 rounded-[6px] px-3 py-2 text-left transition-colors duration-100 ${
                      i === active ? "bg-wash" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-ink transition-colors duration-100 group-hover:text-accent">
                        {hit.title}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-3">{hit.sub}</span>
                    </span>
                    {hit.external ? (
                      <IconExternal className="h-3 w-3 shrink-0 text-ink-3" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-ink-3">
          <span>↑↓ 选择 · Enter 打开</span>
          <span>
            {data
              ? `文章 ${data.posts.length} · 展品 ${data.exhibits.length} · 书签 ${data.tools.length}`
              : "索引加载中…"}
          </span>
        </div>
      </div>
    </div>
  );
}
