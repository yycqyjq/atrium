"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeading from "@/components/ui/SectionHeading";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import type { GallerySection } from "@/lib/gallery";

/**
 * 画廊浏览器：即时搜索（图片名 / 相册名）+ 分区铺陈。
 * 搜索时只保留命中图片（相册名命中则整卷保留），空相册自动隐藏；
 * 灯箱上下文跟随当前展示列表（跨相册连续翻页）。
 */
export default function GalleryBrowser({
  sections,
  canEdit,
  initialAlbum,
  initialView,
}: {
  sections: GallerySection[];
  canEdit: boolean;
  initialAlbum?: string;
  initialView?: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((section) => {
        if (section.name.toLowerCase().includes(q)) return section;
        return { ...section, images: section.images.filter((image) => image.name.toLowerCase().includes(q)) };
      })
      .filter((section) => section.images.length > 0);
  }, [sections, q]);

  const total = filtered.reduce((n, section) => n + section.images.length, 0);
  const grandTotal = sections.reduce((n, section) => n + section.images.length, 0);
  const flat = filtered.flatMap((section) => section.images);
  let cursor = 0;

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索图片名或相册…" />

      {total === 0 ? (
        <EmptyState
          variant="search"
          title={`没有找到「${query.trim()}」。`}
          sub="换个词试试，或把新图片传进画廊。"
        />
      ) : (
        <div data-floor-nav>
          {filtered.map((section) => {
            const contextStart = cursor;
            cursor += section.images.length;
            return (
              <section key={section.key} className="mb-10">
                <SectionHeading
                  id={`album-${section.slug}`}
                  title={section.name}
                  count={`${section.images.length} 张`}
                  className="mb-4"
                />
                <GalleryGrid
                  images={section.images}
                  contextImages={flat}
                  contextStart={contextStart}
                  initialView={initialAlbum === section.name && initialView != null ? initialView : undefined}
                  canEdit={canEdit}
                />
              </section>
            );
          })}
          <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">
            {q ? `${total} / ${grandTotal} 张` : `共 ${total} 张`}
          </p>
        </div>
      )}
    </>
  );
}
