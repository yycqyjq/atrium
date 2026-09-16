"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";

export type BrowserPost = {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  folder: string;
  tags: string[];
};

export type BrowserFolder = { name: string; path: string; total: number };

export type BrowserSection = { folder: BrowserFolder | null; posts: BrowserPost[] };

const postHref = (slug: string) => `/study/${slug.split("/").map(encodeURIComponent).join("/")}`;

function PostRow({ post, showFolder = false }: { post: BrowserPost; showFolder?: boolean }) {
  return (
    <Link
      href={postHref(post.slug)}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 border-b border-line py-4 pr-1 transition-colors duration-150 last:border-0 hover:bg-wash max-xs:grid-cols-1 max-xs:gap-y-1"
    >
      <span className="block min-w-0">
        <span className="block font-serif text-[16.5px] leading-normal tracking-[0.015em] text-ink transition-colors duration-150 group-hover:text-accent">
          {post.title}
        </span>
        {post.description ? (
          <span className="mt-1 block max-w-[52em] truncate text-[13px] leading-[1.65] text-ink-3">
            {post.description}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-[12px] leading-[1.9] text-ink-3 tabular-nums">
        {showFolder && post.folder ? <span className="block tracking-[0.04em]">{post.folder}</span> : null}
        {post.dateLabel ? <span className="block">{post.dateLabel}</span> : null}
      </span>
    </Link>
  );
}

/**
 * 书房浏览器：文件夹分组视图 + 全量搜索。
 * - 无查询：按分组渲染（根目录文章 + 各文件夹标题与其文章，标题可下钻）
 * - 有查询：在全部文章（跨目录、多层）内过滤，扁平展示
 */
export default function StudyBrowser({
  sections,
  allPosts,
  placeholder,
}: {
  sections: BrowserSection[];
  allPosts: BrowserPost[];
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return [];
    return allPosts.filter((post) =>
      [post.title, post.description, post.tags.join(" "), post.folder, post.slug].some((text) =>
        text.toLowerCase().includes(q),
      ),
    );
  }, [q, allPosts]);

  const viewCount = sections.reduce((n, s) => n + s.posts.length, 0);
  const showRootHeading = sections.length > 1 && (sections[0]?.posts.length ?? 0) > 0;

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />

      {q ? (
        filtered.length === 0 ? (
          <div className="py-14 text-center">
            <p className="mb-2 font-serif text-[17px] tracking-[0.02em]">没有找到「{query.trim()}」。</p>
            <p className="text-[13px] text-ink-3">换个词试试，或去写作台写一篇。</p>
          </div>
        ) : (
          <>
            <p className="mb-1 text-[12px] tracking-[0.1em] text-ink-3">全量搜索 · 全部目录</p>
            <ul>
              {filtered.map((post) => (
                <li key={post.slug}>
                  <PostRow post={post} showFolder />
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <>
          {sections.map((section, index) => {
            const key = section.folder?.path ?? "__root__";
            if (section.folder === null && section.posts.length === 0) return null;
            return (
              <section key={key} className="mt-8 first:mt-3">
                {section.folder ? (
                  <h2
                    id={`dir-${section.folder.path}`}
                    data-floor-title={section.folder.name}
                    className="mb-1 flex scroll-mt-8 items-baseline justify-between gap-4 border-b border-line pb-2"
                  >
                    <Link
                      href={`/study/${encodeURIComponent(section.folder.path)}`}
                      className="group inline-flex items-baseline gap-2.5"
                    >
                      <span className="font-serif text-[17px] tracking-[0.02em] text-ink transition-colors duration-150 group-hover:text-accent">
                        {section.folder.name}
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {section.folder.total} 篇
                        {section.folder.total !== section.posts.length ? ` · 本层 ${section.posts.length}` : ""}
                      </span>
                    </Link>
                    <Link
                      href={`/study/${encodeURIComponent(section.folder.path)}`}
                      className="group inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors duration-150 hover:text-accent"
                    >
                      进入
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5">
                        <path d="M5 12 H19" />
                        <path d="M13.5 6.5 L19 12 L13.5 17.5" />
                      </svg>
                    </Link>
                  </h2>
                ) : index === 0 && showRootHeading ? (
                  <div className="mb-1 flex items-baseline gap-2.5 border-b border-line pb-2">
                    <span className="font-serif text-[17px] tracking-[0.02em] text-ink-2">根目录</span>
                    <span className="text-[12px] text-ink-3">{section.posts.length} 篇</span>
                  </div>
                ) : null}
                <ul>
                  {section.posts.map((post) => (
                    <li key={post.slug}>
                      <PostRow post={post} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}

      <p className="mt-7 text-[12.5px] tracking-[0.05em] text-ink-3">
        {q ? `${filtered.length} / ${allPosts.length} 篇` : `本页 ${viewCount} 篇 · 书房全量 ${allPosts.length} 篇`}
      </p>
    </>
  );
}
