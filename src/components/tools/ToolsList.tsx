"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import SectionHeading from "@/components/ui/SectionHeading";
import EmptyState from "@/components/ui/EmptyState";
import { ToolCardContent } from "./ToolCard";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { IconPencil, IconX } from "@/components/icons";
import type { ToolGroup } from "@/lib/tools";

/** 工具房列表 + 即时搜索 + 书签删除（可写环境下显示） */
export default function ToolsList({ groups, canWrite = false }: { groups: ToolGroup[]; canWrite?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editTool, setEditTool] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", url: "", description: "", category: "" });

  async function saveEdit() {
    const res = await fetch("/api/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tool", ...editForm }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setNotice({ kind: "error", text: data.error ?? "保存失败" });
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setEditTool(null);
    setNotice({ kind: "ok", text: `已更新「${editForm.name}」` });
    setTimeout(() => setNotice(null), 3000);
    router.refresh();
  }

  async function renameCategory() {
    const oldName = editCategory ?? "";
    const res = await fetch("/api/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "category", oldName, name: categoryName.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setNotice({ kind: "error", text: data.error ?? "重命名失败" });
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setEditCategory(null);
    setNotice({ kind: "ok", text: `分类已重命名为「${categoryName.trim()}」` });
    setTimeout(() => setNotice(null), 3000);
    router.refresh();
  }

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
                      {editTool === key ? (
                        <Card padding="none" className="border-accent bg-accent-soft px-4 py-3.5">
                          <p className="mb-2 text-[12px] tracking-[0.08em] text-accent-ink">编辑工具</p>
                          <Input
                            size="sm"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="mb-2"
                            placeholder="名称"
                          />
                          <Input
                            size="sm"
                            value={editForm.url}
                            onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                            className="mb-2"
                            placeholder="地址"
                          />
                          <Input
                            size="sm"
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            className="mb-2"
                            placeholder="描述"
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={saveEdit}>
                              保存
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setEditTool(null)}>
                              取消
                            </Button>
                          </div>
                        </Card>
                      ) : confirmDelete === key ? (
                        <Card padding="none" className="border-accent bg-accent-soft px-4 py-3.5">
                          <p className="mb-2.5 text-[12.5px] leading-relaxed text-accent-ink">
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
                        </Card>
                      ) : (
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                      >
                        {canWrite && confirmDelete !== key ? (
                          <span className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label={`编辑 ${tool.name}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setEditForm({ name: tool.name, url: tool.url, description: tool.description, category: tool.category });
                                setEditTool(key);
                                setConfirmDelete(null);
                              }}
                              className="rounded p-1 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-accent"
                            >
                              <IconPencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`删除 ${tool.name}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setConfirmDelete(key);
                                setEditTool(null);
                              }}
                              className="rounded p-1 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-accent"
                            >
                              <IconX className="size-3.5" />
                            </button>
                          </span>
                        ) : null}
                        <ToolCardContent
                          name={tool.name}
                          url={tool.url}
                          description={tool.description}
                          showArrow={!canWrite}
                        />
                      </a>
                      )}
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
    </>
  );
}
