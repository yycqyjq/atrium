"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FloorItem = { id: string; title: string; level: number; el: HTMLElement };

/** 收起状态横杠长度（按层级：一级最长） */
const BAR_WIDTH: Record<number, number> = { 1: 20, 2: 13, 3: 9 };
const CURRENT_EXTRA = 9;

/**
 * 右侧轻量楼层跳转目录。
 *
 * - 默认：极简小横杠（右侧竖排，按层级长短缩进），当前楼层高亮（更长更亮），
 *   所在层级的所有父级弱高亮；
 * - 悬停 / 键盘聚焦：平滑展开标题列表（层级缩进），当前项高亮、父级弱高亮，
 *   光标在横杠与文字之间移动不会误收起；
 * - 点击：平滑滚动到目标楼层（带顶部偏移），立即更新高亮并同步地址栏（不跳动）；
 * - 滚动：自动判定当前楼层（含页面底部归最后一层），窗口缩放后重算。
 *
 * 挂在任意内容容器上：给容器加 `data-floor-nav`，组件扫描其中的 h2/h3/h4（最多三级）。
 */
export default function FloorNav() {
  const [items, setItems] = useState<FloorItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // 扫描容器内的标题（结构变化时重建，如搜索过滤）
  const scan = useCallback(() => {
    const root = document.querySelector("[data-floor-nav]");
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h4"));
    setItems(
      els.map((el, i) => ({
        id: el.id || `floor-${i}`,
        title: (el.textContent ?? "").trim(),
        level: el.tagName === "H2" ? 1 : el.tagName === "H3" ? 2 : 3,
        el,
      })),
    );
  }, []);

  useEffect(() => {
    scan();
    const root = document.querySelector("[data-floor-nav]");
    if (!root) return;
    const mo = new MutationObserver(() => window.requestAnimationFrame(scan));
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [scan]);

  // 当前楼层判定（滚动 / 缩放 / 结构变化）
  useEffect(() => {
    if (items.length === 0) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const offset = 96;
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      let idx = 0;
      if (atBottom) {
        idx = items.length - 1;
      } else {
        for (let i = 0; i < items.length; i += 1) {
          const top = items[i].el.getBoundingClientRect().top;
          if (top - offset <= 0) idx = i;
          else break;
        }
      }
      setCurrent(idx);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  // 点击跳转：平滑滚动 + 立即高亮 + 地址栏同步（不跳页）
  const jump = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      item.el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      setCurrent(index);
      try {
        history.replaceState(null, "", `#${encodeURIComponent(item.id)}`);
      } catch {
        /* 忽略 */
      }
    },
    [items],
  );

  if (items.length < 2) return null;

  // 当前项的祖先集合（用于父级弱高亮）
  const ancestors = new Set<number>();
  {
    let level = items[current]?.level ?? 1;
    for (let i = current - 1; i >= 0; i -= 1) {
      if (items[i].level < level) {
        ancestors.add(i);
        level = items[i].level;
        if (level === 1) break;
      }
    }
  }

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  return (
    <nav
      aria-label="楼层目录"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex"
      onMouseEnter={() => {
        cancelClose();
        setExpanded(true);
      }}
      onMouseLeave={() => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setExpanded(false), 120);
      }}
      onFocusCapture={() => {
        cancelClose();
        setExpanded(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(false);
      }}
    >
      <div className="flex items-center">
        {/* 展开面板：宽度平滑过渡（横杠位置不动，无跳动） */}
        <div
          aria-hidden={!expanded}
          className={`overflow-hidden transition-[width,opacity] duration-200 ease-out ${
            expanded ? "w-[196px] opacity-100" : "w-0 opacity-0"
          }`}
        >
          <ul className="max-h-[62vh] w-[196px] overflow-y-auto rounded-ctl border border-line bg-raised py-1">
            {items.map((item, i) => {
              const isCurrent = i === current;
              const isAncestor = ancestors.has(i);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-floor-row
                    data-state={isCurrent ? "current" : isAncestor ? "ancestor" : "idle"}
                    tabIndex={expanded ? 0 : -1}
                    onClick={() => jump(i)}
                    className={`flex h-7 w-full items-center truncate rounded-[6px] pr-3 text-left text-[12.5px] leading-normal transition-colors duration-150 ${
                      item.level === 1 ? "pl-3" : item.level === 2 ? "pl-7" : "pl-11"
                    } ${
                      isCurrent
                        ? "bg-accent-soft font-medium text-accent-ink"
                        : isAncestor
                          ? "text-accent/55"
                          : "text-ink-2 hover:bg-wash hover:text-accent"
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 横杠列（收起状态本体）：行高与面板行一致，逐行对齐 */}
        <span className="ml-2 flex flex-col items-end py-1 pr-0.5">
          {items.map((item, i) => {
            const isCurrent = i === current;
            const isAncestor = ancestors.has(i);
            return (
              <span key={item.id} aria-hidden className="flex h-7 items-center justify-end">
                <span
                  data-floor-bar
                  data-state={isCurrent ? "current" : isAncestor ? "ancestor" : "idle"}
                  style={{ width: (BAR_WIDTH[item.level] ?? 12) + (isCurrent ? CURRENT_EXTRA : 0) }}
                  className={`block rounded-full transition-all duration-200 ${
                    item.level === 1 ? "h-[3px]" : "h-[2.5px]"
                  } ${isCurrent ? "bg-accent" : isAncestor ? "bg-accent/40" : "bg-line-strong"}`}
                />
              </span>
            );
          })}
        </span>
      </div>
    </nav>
  );
}
