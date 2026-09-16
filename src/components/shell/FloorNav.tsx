"use client";

import { useCallback, useEffect, useState } from "react";

type FloorItem = { id: string; title: string; level: number; el: HTMLElement };

/** 收起状态横杠长度（按层级：一级最长） */
const BAR_WIDTH: Record<number, number> = { 1: 20, 2: 13, 3: 9 };
const CURRENT_EXTRA = 9;

/**
 * 右侧轻量楼层跳转目录（逐项形变版）。
 *
 * - 默认：竖排小横杠，当前楼层更长更亮（主题色），父级弱高亮；
 * - 悬停（或键盘聚焦）：**只有划过的那一根**在原位变成对应的标题文字，
 *   其余保持横杠；移开后缩回横杠。纯 opacity/transform，零布局位移；
 * - 点击：平滑滚动到对应楼层（带顶部偏移），立即高亮并同步地址栏（不跳页）；
 * - 滚动：自动判定当前楼层（底部归最后一项），窗口缩放与结构变化后重算。
 *
 * 挂载：给内容容器加 `data-floor-nav`，组件扫描其中的 h2/h3/h4（最多三级）。
 */
export default function FloorNav() {
  const [items, setItems] = useState<FloorItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  // 扫描容器内的标题（结构变化时重建，如搜索过滤）
  const scan = useCallback(() => {
    const root = document.querySelector("[data-floor-nav]");
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h4"));
    setItems(
      els.map((el, i) => ({
        id: el.id || `floor-${i}`,
        title: (el.dataset.floorTitle ?? el.textContent ?? "").trim(),
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

  return (
    <nav aria-label="楼层目录" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <ul className="flex flex-col items-end">
        {items.map((item, i) => {
          const isCurrent = i === current;
          const isAncestor = ancestors.has(i);
          const isHovered = hovered === i;
          return (
            <li key={item.id} className="h-7">
              <button
                type="button"
                data-floor-row
                data-state={isCurrent ? "current" : isAncestor ? "ancestor" : "idle"}
                onClick={() => jump(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((h) => (h === i ? null : h))}
                aria-label={item.title}
                className="relative flex h-7 w-[44px] cursor-pointer items-center justify-end outline-none"
              >
                {/* 标题：划过时在同位浮现，其余项保持横杠 */}
                <span
                  aria-hidden
                  data-floor-label
                  className={`absolute right-0 flex h-7 items-center whitespace-nowrap px-2.5 text-[12.5px] leading-none transition-[opacity,transform] duration-200 ease-out ${
                    isHovered ? "translate-x-0 opacity-100" : "translate-x-[4px] opacity-0"
                  } ${
                    isCurrent
                      ? "font-semibold text-accent"
                      : isAncestor
                        ? "text-accent/60"
                        : "text-ink"
                  }`}
                >
                  {item.title}
                </span>

                {/* 横杠：该行被划过时收拢 */}
                <span
                  aria-hidden
                  data-floor-bar
                  data-state={isCurrent ? "current" : isAncestor ? "ancestor" : "idle"}
                  style={{ width: isHovered ? 0 : (BAR_WIDTH[item.level] ?? 12) + (isCurrent ? CURRENT_EXTRA : 0) }}
                  className={`block rounded-full transition-all duration-200 ${
                    item.level === 1 ? "h-[3px]" : "h-[2.5px]"
                  } ${isHovered ? "opacity-0" : "opacity-100"} ${
                    isCurrent ? "bg-accent" : isAncestor ? "bg-accent/40" : "bg-line-strong"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
