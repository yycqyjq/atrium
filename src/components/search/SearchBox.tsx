"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  href: string;
  title: string;
  sub?: string;
  extra?: string;
};

/**
 * 即时搜索：输入即过滤（标题 / 副文本），Cmd+K 或 / 聚焦，Esc 清空。
 * 纯客户端内存过滤，数据量（数百条）内毫无压力。
 */
export default function SearchBox({ items, placeholder }: { items: Item[]; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.sub ?? "", item.extra ?? ""].some((text) => text.toLowerCase().includes(q)),
    );
  }, [items, q]);

  // 快捷键：/ 或 Cmd/Ctrl+K 聚焦；Esc 清空并失焦
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && typing && target === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 空态与结果态渲染由父组件决定；这里只把过滤结果透传给父组件的渲染函数
  return { query, setQuery, filtered, focused, inputRef } as const;
}

/** 共用的搜索输入框外观 */
export function SearchInput({
  value,
  onChange,
  onFocus,
  onBlur,
  inputRef,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
}) {
  return (
    <div className="relative mb-5">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16 L20 20" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-ctl border border-line bg-raised py-2.5 pl-10 pr-16 text-[13.5px] outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3 md:block">
        ⌘K
      </kbd>
    </div>
  );
}
