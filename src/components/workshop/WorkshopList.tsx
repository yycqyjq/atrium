"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/search/SearchBox";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeading from "@/components/ui/SectionHeading";
import { DemoCard, LinkProjectCard } from "@/components/workshop/DemoCard";
import type { DemoProject } from "@/lib/config";
import type { DemoItem } from "@/lib/demos";

type Section = { key: string; title: string; items: DemoItem[] };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";

/** 工坊展品区：分区铺开 + 即时搜索（标题 / 说明 / 分组 / 项目） */
export default function WorkshopList({
  sections,
  urlProjects,
}: {
  sections: Section[];
  urlProjects: DemoProject[];
}) {
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const router = useRouter();
  const q = query.trim().toLowerCase();

  /** 手动刷新：绕过清单缓存真回源，再让服务端组件重渲染（列表与「数据可能过期」提示一起更新） */
  const refresh = async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const res = await fetch("/api/demos/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await router.refresh();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredSections = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          [item.title, item.desc, item.group, item.projectName].some((text) =>
            text?.toLowerCase().includes(q),
          ),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, q]);

  const filteredProjects = useMemo(() => {
    if (!q) return urlProjects;
    return urlProjects.filter((project) =>
      [project.name, project.desc].some((text) => text?.toLowerCase().includes(q)),
    );
  }, [urlProjects, q]);

  const total =
    filteredSections.reduce((n, section) => n + section.items.length, 0) + filteredProjects.length;

  return (
    <>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="搜索展品（名称、说明、分组）…"
        trailing={
          <span className="flex shrink-0 items-center gap-2">
            {refreshError ? <span className="text-[12px] text-accent-ink">刷新失败</span> : null}
            <Button variant="quiet" size="sm" onClick={refresh} disabled={refreshing}>
              {refreshing ? "刷新中…" : "刷新"}
            </Button>
          </span>
        }
      />

      {total === 0 ? (
        <EmptyState
          variant="search"
          title={`没有找到「${query.trim()}」。`}
          sub="换个词试试，或检查展品清单。"
        />
      ) : (
        <div data-floor-nav>
          {filteredSections.map((section) => (
            <section key={section.key} className="mb-10">
              <SectionHeading
                id={`grp-${slugify(section.title)}`}
                title={section.title}
                count={`${section.items.length} 件`}
                className="mb-4"
              />
              <ul className="gap-3 md:columns-2 xl:columns-3">
                {section.items.map((item) => (
                  <li key={`${item.projectId}/${item.id}`} className="mb-3 break-inside-avoid">
                    <DemoCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {filteredProjects.length > 0 ? (
            <section className="mb-10">
              <SectionHeading
                id="grp-external"
                title="线上站点"
                count={`${filteredProjects.length} 件`}
                className="mb-4"
              />
              <ul className="gap-3 md:columns-2 xl:columns-3">
                {filteredProjects.map((project) => (
                  <li key={project.id} className="mb-3 break-inside-avoid">
                    <LinkProjectCard project={project} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">共 {total} 件展品</p>
        </div>
      )}
    </>
  );
}
