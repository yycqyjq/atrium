"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import SectionHeading from "@/components/ui/SectionHeading";
import EmptyState from "@/components/ui/EmptyState";
import PostRow, { type PostRowData } from "./PostRow";

export type BrowserPost = PostRowData;

export type BrowserFolder = { name: string; path: string; total: number };

export type BrowserSection = { folder: BrowserFolder | null; posts: BrowserPost[] };

/**
 * 书房浏览器：文件夹分组视图 + 全量搜索。
 * - 无查询：按分组渲染（根目录文章 + 各文件夹标题与其文章，标题可下钻）
 * - 有查询：在全部文章（跨目录、多层）内过滤，扁平展示
 * - manageable：是否在行内显示编辑 / 删除（由页面按写开关传入）
 */
export default function StudyBrowser({
  sections,
  allPosts,
  placeholder,
  manageable = false,
}: {
  sections: BrowserSection[];
  allPosts: BrowserPost[];
  placeholder: string;
  manageable?: boolean;
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
          <EmptyState
            variant="search"
            title={`没有找到「${query.trim()}」。`}
            sub="换个词试试，或去写作台写一篇。"
          />
        ) : (
          <>
            <p className="mb-1 text-[12px] tracking-[0.1em] text-ink-3">全量搜索 · 全部目录</p>
            <ul>
              {filtered.map((post) => (
                <li key={post.slug}>
                  <PostRow post={post} showFolder manageable={manageable} />
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
                  <SectionHeading
                    id={`dir-${section.folder.path}`}
                    floorTitle={section.folder.name}
                    title={section.folder.name}
                    count={`${section.folder.total} 篇${
                      section.folder.total !== section.posts.length ? ` · 本层 ${section.posts.length}` : ""
                    }`}
                    href={`/study/${encodeURIComponent(section.folder.path)}`}
                    className="mb-1"
                  />
                ) : index === 0 && showRootHeading ? (
                  <SectionHeading
                    title="根目录"
                    count={`${section.posts.length} 篇`}
                    muted
                    countInline
                    className="mb-1"
                  />
                ) : null}
                <ul>
                  {section.posts.map((post) => (
                    <li key={post.slug}>
                      <PostRow post={post} manageable={manageable} />
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
