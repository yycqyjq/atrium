"use client";

import { useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import Combobox from "@/components/ui/Combobox";
import Button from "@/components/ui/Button";
import { useToast, Toast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Masonry } from "@/components/ui/Masonry";

/** 陈列廊演示：搜索框（真实组件，本页可用） */
export function SearchDemo() {
  const [query, setQuery] = useState("");
  return <SearchInput value={query} onChange={setQuery} placeholder="试试输入（真实组件）…" />;
}

/** 陈列廊演示：可输入下拉（真实组件，本页可用） */
export function ComboboxDemo() {
  const [value, setValue] = useState("工具");
  return (
    <Combobox
      id="demo-combobox"
      value={value}
      onChange={setValue}
      options={["博客论坛", "工具", "软件下载", "开发工具", "政府"]}
      placeholder="输入或选择分类"
    />
  );
}

/** 陈列廊演示：轻提示（全站统一 Toast，底部浮出自动消失） */
export function ToastDemo() {
  const { toast, showToast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button size="sm" onClick={() => showToast("已保存（成功语气）", "ok")}>
        触发成功提示
      </Button>
      <Button size="sm" variant="danger" onClick={() => showToast("保存失败（错误语气）", "error")}>
        触发错误提示
      </Button>
      <Toast toast={toast} />
    </div>
  );
}

/** 陈列廊演示：确认弹窗（危险操作确认，全站同款） */
export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        打开确认弹窗
      </Button>
      {done ? <span className="text-[12.5px] text-ink-2">已确认 ✓</span> : null}
      <ConfirmDialog
        open={open}
        title="删除这条记录？"
        description="此操作不可撤销。演示用途：确认后仅更新本页状态。"
        tone="danger"
        onConfirm={() => {
          setDone(true);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/** 陈列廊演示：瀑布流（纯 CSS 多栏，列数随时切换） */
export function MasonryDemo() {
  const [cols, setCols] = useState(3);
  const items = [92, 64, 120, 78, 56, 104, 70, 88, 62, 96, 72, 84];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] tracking-[0.12em] text-ink-3">列数</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCols(n)}
            className={`rounded-[5px] border px-2.5 py-0.5 text-[12px] transition-colors duration-150 ${
              cols === n ? "border-accent bg-accent-soft font-medium text-accent-ink" : "border-line text-ink-3 hover:text-ink-2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <Masonry columns={cols} gap={10}>
        {items.map((h, i) => (
          <div
            key={i}
            className="mb-2.5 break-inside-avoid rounded-ctl border border-line bg-raised p-3"
            style={{ minHeight: h }}
          >
            <p className="text-[12.5px] font-medium">{String(i + 1).padStart(2, "0")} · 卡片</p>
            <p className="text-[11.5px] text-ink-3">高度随内容变化，多栏自动填排。</p>
          </div>
        ))}
      </Masonry>
    </div>
  );
}
