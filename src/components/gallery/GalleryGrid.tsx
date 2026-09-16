"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/lib/gallery";
import { IconX, IconChevronLeft, IconChevronRight } from "@/components/icons";

/** 带备用源降级的图片：主源加载失败时自动依次切换 fallbackUrls */
function SmartImage({
  src,
  fallbacks,
  alt,
  eager = false,
  className,
}: {
  src: string;
  fallbacks: string[];
  alt: string;
  /** 灯箱大图等需要立即加载的场景置 true；默认按视口懒加载 */
  eager?: boolean;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(eager);
  const ref = useRef<HTMLImageElement | null>(null);
  const chain = [src, ...fallbacks];
  const current = chain[Math.min(idx, chain.length - 1)] ?? src;

  // 视口门控：进入视口（含少量余量）前不发起图片请求，先以浅底占位
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={visible ? current : undefined}
      data-src={visible ? undefined : current}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${className ?? ""}${visible ? "" : " min-h-[120px] bg-wash"}`}
      onError={() => setIdx((i) => (i < chain.length - 1 ? i + 1 : i))}
    />
  );
}

/**
 * 画廊图片墙 + 灯箱：
 * 点击打开大图，Esc / 点击背景关闭，← → 或滑动翻页，可查看原图。
 * initialView 用于深链（?album=&view=N）直接打开本相册第 N 张。
 * contextImages/contextStart：传入全局图序（跨相册），灯箱翻页可连续跨相册。
 */
export default function GalleryGrid({
  images,
  initialView,
  contextImages,
  contextStart = 0,
}: {
  images: GalleryImage[];
  initialView?: number;
  contextImages?: GalleryImage[];
  contextStart?: number;
}) {
  const list = contextImages ?? images;
  const base = contextImages ? contextStart : 0;
  const [current, setCurrent] = useState<number | null>(
    initialView != null && Number.isInteger(initialView) && initialView >= 0 && initialView < images.length
      ? base + initialView
      : null,
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => setCurrent(null), []);
  const step = useCallback(
    (delta: number) =>
      setCurrent((c) => (c == null ? c : (c + delta + list.length) % list.length)),
    [list.length],
  );

  // 灯箱打开时：键盘导航 + 锁定页面滚动 + 聚焦关闭按钮
  useEffect(() => {
    if (current == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [current, close, step]);

  // 预加载相邻两张（含备用源链），翻页更顺
  useEffect(() => {
    if (current == null) return;
    for (const d of [-1, 1]) {
      const next = list[(current + d + list.length) % list.length];
      for (const url of [next.url, ...next.fallbackUrls]) {
        const probe = new window.Image();
        probe.src = url;
      }
    }
  }, [current, list]);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const active = current != null ? list[current] : null;

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
        {images.map((image, i) => (
          <button
            key={image.path}
            type="button"
            onClick={() => setCurrent(base + i)}
            className="group mb-3 block w-full break-inside-avoid cursor-zoom-in overflow-hidden rounded-ctl border border-line text-left transition-colors duration-200 hover:border-line-strong"
            title={image.name}
          >
            {/* 图片直接来自仓库原始文件（raw），按需懒加载 */}
            <SmartImage
              src={image.url}
              fallbacks={image.fallbackUrls}
              alt={image.name}
              className="block w-full transition-opacity duration-200 group-hover:opacity-90"
            />
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          className="fixed inset-0 z-50 flex animate-rise flex-col bg-black/85 backdrop-blur-[2px]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 text-white">
            <p className="min-w-0 truncate text-[12.5px] tracking-[0.03em] text-white/95">{active.name}</p>
            <div className="flex shrink-0 items-center gap-4">
              <span className="text-[12px] tabular-nums">
                {current! + 1} / {list.length}
              </span>
              <a
                href={active.fallbackUrls[active.fallbackUrls.length - 1] ?? active.url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-white/85 underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:text-white"
              >
                原图
              </a>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                aria-label="关闭"
                className="rounded-full p-1.5 text-white ring-1 ring-white/40 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              >
                <IconX strokeWidth={1.8} className="size-[18px]" />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 md:px-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <SmartImage
              key={active.url}
              src={active.url}
              fallbacks={active.fallbackUrls}
              alt={active.name}
              eager
              className="max-h-full max-w-full rounded-ctl object-contain shadow-2xl"
            />
            {list.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="上一张"
                  className="absolute left-2 rounded-full bg-white/10 p-2.5 text-white/75 transition-colors duration-150 hover:bg-white/20 hover:text-white md:left-4"
                >
                  <IconChevronLeft strokeWidth={1.8} className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="下一张"
                  className="absolute right-2 rounded-full bg-white/10 p-2.5 text-white/75 transition-colors duration-150 hover:bg-white/20 hover:text-white md:right-4"
                >
                  <IconChevronRight strokeWidth={1.8} className="size-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
