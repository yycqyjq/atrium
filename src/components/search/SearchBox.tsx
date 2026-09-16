"use client";

import { useEffect, useRef } from "react";
import { IconSearch } from "@/components/icons";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
};

/** 共用搜索输入框：放大镜图标 + ⌘K 提示；/ 或 Cmd/Ctrl+K 聚焦，Esc 清空并失焦 */
export function SearchInput({
  value,
  onChange,
  onFocus,
  onBlur,
  inputRef,
  placeholder,
}: Props) {
  const innerRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? innerRef;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        ref.current?.focus();
      }
      if (e.key === "Escape" && typing && target === ref.current) {
        onChange("");
        ref.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange, ref]);

  return (
    <div className="relative mb-5">
      <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-ctl border border-line bg-raised py-2.5 pl-10 pr-16 text-[13.5px] outline-none transition-colors duration-150 placeholder:text-ink-3 hover:border-line-strong focus:border-accent"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3 md:block">
        ⌘K
      </kbd>
    </div>
  );
}
