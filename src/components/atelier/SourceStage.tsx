"use client";

import { useState, type ReactNode } from "react";

/**
 * 陈列廊 · 组件示例舞台：预览 / 源码 双页签（源码在最后）。
 * 预览 = 服务端渲染好的真实组件（children）；源码 = 构建期读入的组件源文件。
 * 页签交互与工坊 ExhibitStage 同款视觉，便于统一认知。
 */
export default function SourceStage({
  children,
  source,
  note,
}: {
  children: ReactNode;
  source: string;
  note?: string;
}) {
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const tabCls = (active: boolean) =>
    `rounded-[5px] px-3 py-1 text-[12px] tracking-[0.03em] transition-colors duration-150 ${
      active ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-3 hover:text-ink-2"
    }`;

  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-0.5 rounded-ctl border border-line p-0.5">
        <button type="button" onClick={() => setTab("preview")} className={tabCls(tab === "preview")}>
          预览
        </button>
        <button type="button" onClick={() => setTab("source")} className={tabCls(tab === "source")}>
          源码
        </button>
        {note ? <span className="ml-2 pr-2 text-[11.5px] tracking-[0.04em] text-ink-3">{note}</span> : null}
      </div>
      {tab === "preview" ? (
        children
      ) : (
        <pre className="max-h-[560px] overflow-auto rounded-ctl border border-line bg-surface px-4 py-3.5 font-mono text-[12px] leading-relaxed text-ink-2">
          {source}
        </pre>
      )}
    </div>
  );
}
