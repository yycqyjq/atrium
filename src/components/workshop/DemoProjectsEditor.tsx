"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Field";
import Combobox from "@/components/ui/Combobox";
import type { DemoProject } from "@/lib/config";

type Row = {
  kind: "repo" | "url";
  name: string;
  repo: string;
  branch: string;
  dir: string;
  url: string;
  desc: string;
  id: string;
};

function toRow(project: DemoProject): Row {
  return {
    kind: project.kind,
    name: project.name,
    repo: project.repo ?? "",
    branch: project.branch ?? "main",
    dir: project.dir ?? "",
    url: project.url ?? "",
    desc: project.desc ?? "",
    id: project.id,
  };
}

const emptyRow = (): Row => ({
  kind: "repo",
  name: "",
  repo: "",
  branch: "main",
  dir: "",
  url: "",
  desc: "",
  id: "",
});

/** 设置页「组件项目」编辑器：可增删多个仓库 / 线上站点 */
export default function DemoProjectsEditor({ initial }: { initial: DemoProject[] }) {
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const update = (index: number, patch: Partial<Row>) =>
    setRows((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  function fail(text: string) {
    setState("error");
    setMessage(text);
  }

  async function save() {
    setMessage("");
    for (const [i, row] of rows.entries()) {
      const label = row.name.trim() || `第 ${i + 1} 个`;
      if (!row.name.trim()) {
        return fail(`第 ${i + 1} 个项目缺少名称。`);
      }
      if (row.kind === "repo" && !/^[^\s/]+(\/[^\s/]+)?$/.test(row.repo.trim())) {
        return fail(`「${label}」的仓库填仓库名即可（如 bricks），也可以写 owner/名字。`);
      }
      if (row.kind === "url" && !/^https?:\/\//i.test(row.url.trim())) {
        return fail(`「${label}」的地址需以 http(s):// 开头。`);
      }
    }

    setState("saving");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoProjects: rows.map((row) => ({
            ...(row.id ? { id: row.id } : {}),
            name: row.name.trim(),
            kind: row.kind,
            ...(row.kind === "repo"
              ? { repo: row.repo.trim(), branch: row.branch.trim() || "main", dir: row.dir.trim() }
              : { url: row.url.trim() }),
            ...(row.desc.trim() ? { desc: row.desc.trim() } : {}),
          })),
        }),
      });
      const data = (await res.json()) as { demoProjects?: DemoProject[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows((data.demoProjects ?? []).map(toRow));
      setState("ok");
      setMessage("已保存。进入「工坊」即可看到展品。");
    } catch (err) {
      setState("error");
      setMessage((err as Error).message || "保存失败");
    }
  }

  return (
    <Card className="bg-raised">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <p className="font-serif text-[15px] tracking-[0.02em]">组件项目</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRows((list) => [...list, emptyRow()])}
        >
          添加项目
        </Button>
      </div>
      <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3">
        「工坊」会读取组件仓库里的 atrium.json
        展品清单，取件并在页面内现场渲染；也可以挂线上站点（新窗口打开）。
        可添加多个项目。仓库一栏直接填仓库名即可（自动使用当前连接的 GitHub 账号），也可以写
        owner/名字。
      </p>

      {rows.length === 0 ? (
        <p className="mb-5 text-[13px] text-ink-3">还没有项目，点右上角「添加项目」开始。</p>
      ) : (
        <div className="mb-5 space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="rounded-ctl border border-line px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[11.5px] tracking-[0.1em] text-ink-3">项目 {i + 1}</span>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                >
                  移除
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor={`dp-kind-${i}`}>类型</FieldLabel>
                  <Combobox
                    id={`dp-kind-${i}`}
                    strict
                    value={row.kind === "url" ? "线上站点" : "组件仓库"}
                    onChange={(v) => update(i, { kind: v === "线上站点" ? "url" : "repo" })}
                    options={["组件仓库", "线上站点"]}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`dp-name-${i}`}>名称</FieldLabel>
                  <Input
                    id={`dp-name-${i}`}
                    value={row.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="砖瓦"
                  />
                </div>
                {row.kind === "repo" ? (
                  <>
                    <div>
                      <FieldLabel htmlFor={`dp-repo-${i}`}>仓库</FieldLabel>
                      <Input
                        id={`dp-repo-${i}`}
                        value={row.repo}
                        onChange={(e) => update(i, { repo: e.target.value })}
                        placeholder="仓库名（如 bricks）"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel htmlFor={`dp-branch-${i}`}>分支</FieldLabel>
                        <Input
                          id={`dp-branch-${i}`}
                          value={row.branch}
                          onChange={(e) => update(i, { branch: e.target.value })}
                          placeholder="main"
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor={`dp-dir-${i}`}>目录</FieldLabel>
                        <Input
                          id={`dp-dir-${i}`}
                          value={row.dir}
                          onChange={(e) => update(i, { dir: e.target.value })}
                          placeholder="缺省仓库根"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <FieldLabel htmlFor={`dp-url-${i}`}>地址</FieldLabel>
                    <Input
                      id={`dp-url-${i}`}
                      value={row.url}
                      onChange={(e) => update(i, { url: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <FieldLabel htmlFor={`dp-desc-${i}`}>说明（可选）</FieldLabel>
                  <Input
                    id={`dp-desc-${i}`}
                    value={row.desc}
                    onChange={(e) => update(i, { desc: e.target.value })}
                    placeholder="一句话说明这个项目"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state === "ok" && message ? (
        <Alert tone="ok" size="sm" className="mb-4">
          {message}
        </Alert>
      ) : null}
      {state === "error" && message ? (
        <Alert tone="error" size="sm" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <Button onClick={save} disabled={state === "saving"}>
        {state === "saving" ? "保存中…" : "保存项目列表"}
      </Button>
    </Card>
  );
}
