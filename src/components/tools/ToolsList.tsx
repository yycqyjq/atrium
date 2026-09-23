"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import SectionHeading from "@/components/ui/SectionHeading";
import EmptyState from "@/components/ui/EmptyState";
import { ToolCardContent } from "./ToolCard";
import ActionCard from "@/components/ui/ActionCard";
import ToolDialog, { type ToolFormValue } from "./ToolDialog";
import { Toast, useToast } from "@/components/ui/Toast";
import { IconPencil, IconX } from "@/components/icons";
import type { ToolGroup } from "@/lib/tools";

/** 工具房列表 + 即时搜索 + 书签删除（可写环境下显示） */
export default function ToolsList({
  groups,
  canWrite = false,
}: {
  groups: ToolGroup[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const [editTarget, setEditTarget] = useState<ToolFormValue | null>(null);

  async function remove(name: string, url: string) {
    setConfirmDelete(null);
    try {
      const res = await fetch(
        `/api/tools?name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`,
        {
          method: "DELETE",
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "移除失败，请稍后再试");
      showToast(`已移除「${name}」。`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "网络异常，请稍后再试", "error");
    }
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
  const categories = useMemo(() => groups.map((group) => group.name), [groups]);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索工具、描述、域名…" />

      {total === 0 ? (
        <EmptyState
          variant="search"
          title={`没有找到「${query.trim()}」。`}
          sub="换个词试试，或把新工具加进仓库的清单里。"
        />
      ) : (
        <>
          {filtered.map((group) => {
            return (
              <section key={group.name} className="mb-10">
                <SectionHeading
                  id={`cat-${group.name}`}
                  title={group.name}
                  count={`${group.items.length} 个`}
                  className="mb-4"
                />
                <ul className="gap-3 md:columns-2 xl:columns-3">
                  {group.items.map((tool) => {
                    const key = `${tool.name}|${tool.url}`;
                    return (
                      <li key={`${tool.category}/${tool.name}`} className="mb-3 break-inside-avoid">
                        <ActionCard
                          actions={
                            canWrite
                              ? [
                                  {
                                    key: "edit",
                                    label: `编辑 ${tool.name}`,
                                    icon: <IconPencil className="size-3.5" />,
                                    onClick: () => {
                                      setEditTarget({
                                        name: tool.name,
                                        url: tool.url,
                                        description: tool.description,
                                        category: tool.category,
                                      });
                                      setConfirmDelete(null);
                                    },
                                  },
                                  {
                                    key: "remove",
                                    label: `移除 ${tool.name}`,
                                    icon: <IconX className="size-3.5" />,
                                    onClick: () => setConfirmDelete(key),
                                  },
                                ]
                              : []
                          }
                          confirming={confirmDelete === key}
                          confirmText={`从清单移除「${tool.name}」？`}
                          onConfirm={() => remove(tool.name, tool.url)}
                          onCancelConfirm={() => setConfirmDelete(null)}
                        >
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                          >
                            <ToolCardContent
                              name={tool.name}
                              url={tool.url}
                              description={tool.description}
                              showArrow={!canWrite}
                            />
                          </a>
                        </ActionCard>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <p className="text-[12.5px] tracking-[0.05em] text-ink-3">
            {q
              ? `${total} / ${groups.reduce((n, g) => n + g.items.length, 0)} 个工具`
              : `共 ${total} 个工具`}
          </p>
        </>
      )}

      <ToolDialog
        open={editTarget != null}
        mode="edit"
        categories={categories}
        initial={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <Toast toast={toast} />
    </>
  );
}
