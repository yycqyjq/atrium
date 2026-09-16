"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import SectionHeading from "@/components/ui/SectionHeading";
import EmptyState from "@/components/ui/EmptyState";
import { ToolCardContent } from "./ToolCard";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import CardActions from "@/components/ui/CardActions";
import ToolDialog, { type ToolFormValue } from "./ToolDialog";
import { IconPencil, IconX } from "@/components/icons";
import type { ToolGroup } from "@/lib/tools";

/** 工具房列表 + 即时搜索 + 书签删除（可写环境下显示） */
export default function ToolsList({ groups, canWrite = false }: { groups: ToolGroup[]; canWrite?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editTarget, setEditTarget] = useState<ToolFormValue | null>(null);

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
  const categories = useMemo(() => groups.map((group) => group.name), [groups]);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索工具、描述、域名…" />

      {notice ? (
        <Alert tone={notice.kind === "error" ? "error" : "ok"} size="sm" className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

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
              <SectionHeading id={`cat-${group.name}`} title={group.name} count={`${group.items.length} 个`} className="mb-4" />
              <ul className="gap-3 md:columns-2 xl:columns-3">
                {group.items.map((tool) => {
                  const key = `${tool.name}|${tool.url}`;
                  return (
                    <li key={`${tool.category}/${tool.name}`} className="mb-3 break-inside-avoid">
                      <div className="group relative">
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                        >
                          {canWrite ? (
                            <CardActions
                              actions={[
                                {
                                  key: "edit",
                                  label: `编辑 ${tool.name}`,
                                  icon: <IconPencil className="size-3.5" />,
                                  onClick: () => {
                                    setEditTarget({ name: tool.name, url: tool.url, description: tool.description, category: tool.category });
                                    setConfirmDelete(null);
                                  },
                                },
                                {
                                  key: "remove",
                                  label: `移除 ${tool.name}`,
                                  icon: <IconX className="size-3.5" />,
                                  onClick: () => {
                                    setConfirmDelete(key);
                                  },
                                },
                              ]}
                            />
                          ) : null}
                          <ToolCardContent
                            name={tool.name}
                            url={tool.url}
                            description={tool.description}
                            showArrow={!canWrite}
                          />
                        </a>
                        {confirmDelete === key ? (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 rounded-ctl border border-line-strong bg-raised/95 px-4 text-center backdrop-blur-[1px]">
                            <p className="text-[12.5px] leading-relaxed text-ink-2">
                              从清单移除「{tool.name}」？
                            </p>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => remove(tool.name, tool.url)}>
                                确认移除
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );})}

          <p className="text-[12.5px] tracking-[0.05em] text-ink-3">
            {q ? `${total} / ${groups.reduce((n, g) => n + g.items.length, 0)} 个工具` : `共 ${total} 个工具`}
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
    </>
  );
}
