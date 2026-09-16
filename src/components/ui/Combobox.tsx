"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fieldClasses } from "@/components/ui/Field";
import { IconChevronDown, IconCheck, IconPlus } from "@/components/icons";

type PanelPos = { left: number; width: number; maxWidth: number; top?: number; bottom?: number };

/**
 * 可输入下拉（Combobox · 全站统一）：
 * - 聚焦/点击展开；输入即筛选；候选外自动出现「使用新分类」行
 * - 面板经 Portal 挂到 body 并固定定位：不会被滚动容器裁切，跟随滚动实时归位
 * - 键盘：↑↓ 移动、Enter 选中、Esc 先收下拉（不误关外层弹层）
 */
export default function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  className = "",
  size = "md",
  customHint,
  autoWidth = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  /** 尺寸档位：md 与输入框同高；sm 用于行内小控件 */
  size?: "md" | "sm";
  /** 「候选之外」行的文案生成器（默认「使用新分类」） */
  customHint?: (input: string) => string;
  /** 宽度自适应：输入框随内容撑开（行内场景用） */
  autoWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filtering, setFiltering] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [autoW, setAutoW] = useState<number | null>(null);

  // 宽度自适应：用隐藏量尺按当前值/占位文本测量，随内容撑开
  useLayoutEffect(() => {
    if (!autoWidth) {
      setAutoW(null);
      return;
    }
    const el = measureRef.current;
    if (!el) return;
    const extra = size === "sm" ? 46 : 66;
    setAutoW(Math.max(size === "sm" ? 84 : 120, Math.ceil(el.getBoundingClientRect().width) + extra));
  }, [autoWidth, value, placeholder, size]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!filtering || !q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, value, filtering]);

  const exact = options.some((option) => option === value.trim());
  const showCustom = filtering && value.trim() !== "" && !exact;
  const rows = useMemo(
    () => (showCustom ? [...filtered, value.trim()] : filtered),
    [filtered, showCustom, value],
  );
  const activeSafe = Math.min(active, Math.max(rows.length - 1, 0));

  /** 依据输入框位置计算面板坐标：下方放不下时自动向上翻转（视口基准） */
  const updatePos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxWidth = Math.max(rect.width, Math.min(440, window.innerWidth - rect.left - 16));
    if (window.innerHeight - rect.bottom < 256 && rect.top > 256) {
      setPos({ left: rect.left, width: rect.width, maxWidth, bottom: window.innerHeight - rect.top + 6 });
    } else {
      setPos({ left: rect.left, width: rect.width, maxWidth, top: rect.bottom + 6 });
    }
  }, []);

  const openDropdown = () => {
    if (open) return;
    updatePos();
    setActive(0);
    setFiltering(false);
    setOpen(true);
  };

  const closeDropdown = useCallback(() => setOpen(false), []);

  // 展开期间：外部点击收起；滚动/缩放时面板实时归位
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeDropdown();
    };
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePos, closeDropdown]);

  const pick = (next: string) => {
    onChange(next);
    // 先复位焦点再收起：即便焦点事件触发重开，也会被随后的关闭覆盖
    inputRef.current?.focus();
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openDropdown();
        return;
      }
      const count = rows.length;
      if (count === 0) return;
      setActive((activeSafe + (e.key === "ArrowDown" ? 1 : -1) + count) % count);
      return;
    }
    if (e.key === "Enter") {
      if (open && rows.length > 0) {
        e.preventDefault();
        pick(rows[activeSafe]);
      }
      return;
    }
    if (e.key === "Escape" && open) {
      // 只收下拉，不干扰外层弹层的 Esc
      e.stopPropagation();
      setOpen(false);
    }
  };

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              width: "max-content",
              minWidth: pos.width,
              maxWidth: pos.maxWidth,
              ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
            }}
            className="z-[80] max-h-[218px] animate-rise overflow-y-auto rounded-ctl border border-line bg-raised py-1 shadow-lg"
          >
            {filtered.map((option, i) => {
              const isSelected = option === value.trim();
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(option)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors duration-100 ${
                    isSelected ? "bg-accent-soft/70 font-medium text-accent-ink" : activeSafe === i ? "bg-wash text-ink" : "text-ink"
                  }`}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {isSelected ? <IconCheck className="size-3.5" /> : null}
                  </span>
                  <span className="truncate">{option}</span>
                </button>
              );
            })}
            {showCustom ? (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => pick(value.trim())}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-ink-2 transition-colors duration-100 ${
                  activeSafe === filtered.length ? "bg-wash" : ""
                }`}
              >
                <span className="flex size-3.5 shrink-0 items-center justify-center">
                  <IconPlus className="size-3.5" />
                </span>
                <span className="truncate">{(customHint ?? ((input: string) => `使用新分类「${input}」`))(value.trim())}</span>
              </button>
            ) : null}
            {rows.length === 0 ? (
              <p className="px-3 py-2 text-[12.5px] text-ink-3">暂无候选，直接输入新分类即可。</p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`} style={autoW != null ? { width: autoW } : undefined}>
      {autoWidth ? (
        <span
          ref={measureRef}
          aria-hidden
          className={`pointer-events-none invisible absolute left-0 top-0 whitespace-pre ${
            size === "sm" ? "text-[12.5px]" : "text-[13.5px]"
          }`}
        >
          {value || placeholder || "\u00A0"}
        </span>
      ) : null}
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open && id ? `${id}-listbox` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) openDropdown();
          // 注意顺序：openDropdown 会把 filtering 复位，随后置回 true 以保证筛选生效
          setFiltering(true);
          setActive(0);
        }}
        onFocus={openDropdown}
        onClick={() => {
          if (!open) openDropdown();
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${fieldClasses({ size, extra: size === "sm" ? "pr-8" : "pr-9" })}`}
      />
      <button
        type="button"
        aria-label="展开选项"
        tabIndex={-1}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`absolute top-1/2 -translate-y-1/2 rounded text-ink-3 transition-colors duration-150 hover:text-ink-2 ${
          size === "sm" ? "right-1.5 p-0.5" : "right-2 p-1"
        }`}
      >
        <IconChevronDown className={`${size === "sm" ? "size-3.5" : "size-4"} transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {panel}
    </div>
  );
}
