"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GalleryImage } from "@/lib/gallery";
import { IconX, IconChevronLeft, IconChevronRight, IconPencil } from "@/components/icons";
import ActionCard from "@/components/ui/ActionCard";
import ImageRenameDialog from "@/components/gallery/ImageRenameDialog";
import { Toast, useToast } from "@/components/ui/Toast";

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
 * canEdit：有写入令牌时开放灯箱内「重命名」。
 */
export default function GalleryGrid({
  images,
  initialView,
  contextImages,
  contextStart = 0,
  canEdit = false,
}: {
  images: GalleryImage[];
  initialView?: number;
  contextImages?: GalleryImage[];
  contextStart?: number;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const rawList = contextImages ?? images;
  // 改名成功、服务端数据刷新前沿用本地补丁，即时显示新名字
  const [patches, setPatches] = useState<Record<string, GalleryImage>>({});
  const list = useMemo(
    () => rawList.map((image) => patches[image.path] ?? image),
    [rawList, patches],
  );
  const base = contextImages ? contextStart : 0;
  const [current, setCurrent] = useState<number | null>(
    initialView != null && Number.isInteger(initialView) && initialView >= 0 && initialView < images.length
      ? base + initialView
      : null,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  // 卡片级操作：编辑走弹层（与工具房同款），移除原位确认
  const [renameTarget, setRenameTarget] = useState<GalleryImage | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const pendingFocusPath = useRef<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const active = current != null ? list[current] : null;

  const close = useCallback(() => {
    setEditing(false);
    setRenameError(null);
    setCurrent(null);
  }, []);
  const step = useCallback(
    (delta: number) =>
      setCurrent((c) => (c == null ? c : (c + delta + list.length) % list.length)),
    [list.length],
  );

  // 灯箱打开时：键盘导航 + 锁定页面滚动 + 聚焦关闭按钮
  useEffect(() => {
    if (current == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === "Escape") {
          setEditing(false);
          setRenameError(null);
        }
        return;
      }
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
  }, [current, close, step, editing]);

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

  // 改名成功后：等服务端数据刷新落地，再把视野跟到新文件名所在位置
  const lastImages = useRef(images);
  useEffect(() => {
    if (lastImages.current === images) return;
    lastImages.current = images;
    const target = pendingFocusPath.current;
    if (!target) return;
    const idx = list.findIndex((image) => image.path === target);
    if (idx >= 0) setCurrent(idx);
    pendingFocusPath.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const startRename = () => {
    if (!active) return;
    setDraft(active.name);
    setRenameError(null);
    setEditing(true);
  };

  /** 改名（灯箱与网格卡片共用）：成功后打本地补丁 + 刷新服务端数据，返回新路径 */
  const performRename = useCallback(
    async (origin: GalleryImage, next: string): Promise<{ path: string; name: string }> => {
      const res = await fetch("/api/gallery/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: origin.path, name: next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        path?: string;
        name?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.path || !data.name) {
        throw new Error(data.error || "改名失败，请稍后再试");
      }
      const newPath = data.path;
      const newName = data.name;
      // URL 里同步替换文件名段（改名后到刷新前，主源仍沿用缓存副本）
      const swap = (u: string) => {
        const fromC = encodeURIComponent(origin.name);
        const toC = encodeURIComponent(newName);
        if (u.includes(fromC)) return u.replace(fromC, toC);
        const fromE = encodeURI(origin.name);
        const toE = encodeURI(newName);
        return u.includes(fromE) ? u.replace(fromE, toE) : u;
      };
      const patched: GalleryImage = {
        name: newName,
        path: newPath,
        url: swap(origin.url),
        fallbackUrls: origin.fallbackUrls.map(swap),
      };
      setPatches((prev) => {
        const nextPatches: Record<string, GalleryImage> = { ...prev };
        nextPatches[origin.path] = patched;
        nextPatches[newPath] = patched;
        // 连续改名的链条：把指向旧路径的历史补丁一并更新
        for (const [key, value] of Object.entries(nextPatches)) {
          if (value.path === origin.path) nextPatches[key] = patched;
        }
        return nextPatches;
      });
      router.refresh();
      return { path: newPath, name: newName };
    },
    [router],
  );

  const confirmRename = async () => {
    if (!active || saving) return;
    const next = draft.trim();
    if (!next) {
      setRenameError("名字不能为空");
      return;
    }
    if (next === active.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setRenameError(null);
    const origin = active;
    try {
      const result = await performRename(origin, next);
      pendingFocusPath.current = result.path;
      setEditing(false);
      setSaving(false);
    } catch (err) {
      setSaving(false);
      setRenameError(err instanceof Error ? err.message : "改名失败，请稍后再试");
    }
  };

  /** 卡片「编辑」：打开重命名弹层 */
  const startCardRename = (image: GalleryImage) => {
    setRenameTarget(patches[image.path] ?? image);
    setConfirmPath(null);
  };

  /** 卡片「移除」：原位确认后从仓库删除图片 */
  const removeImage = async (image: GalleryImage) => {
    const origin = patches[image.path] ?? image;
    setConfirmPath(null);
    try {
      const res = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: origin.path }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "移除失败，请稍后再试");
      showToast(`「${origin.name}」已移除。`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "移除失败，请稍后再试", "error");
    }
  };

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
        {images.map((image, i) => {
          const view = patches[image.path] ?? image;
          return (
            <ActionCard
              key={image.path}
              className="mb-3 break-inside-avoid overflow-hidden rounded-ctl border border-line transition-colors duration-200 hover:border-line-strong"
              actions={
                canEdit
                  ? [
                      {
                        key: "rename",
                        label: `重命名 ${view.name}`,
                        icon: <IconPencil className="size-3.5" />,
                        onClick: () => startCardRename(image),
                      },
                      {
                        key: "remove",
                        label: `移除 ${view.name}`,
                        icon: <IconX className="size-3.5" />,
                        onClick: () => setConfirmPath(image.path),
                      },
                    ]
                  : []
              }
              confirming={confirmPath === image.path}
              confirmText={`从画廊移除「${view.name}」？`}
              onConfirm={() => void removeImage(image)}
              onCancelConfirm={() => setConfirmPath(null)}
            >
              <button
                type="button"
                onClick={() => setCurrent(base + i)}
                className="block w-full cursor-zoom-in text-left"
                title={view.name}
                aria-label={`打开 ${view.name}`}
              >
                {/* 图片直接来自仓库原始文件，按需懒加载 */}
                <SmartImage
                  src={view.url}
                  fallbacks={view.fallbackUrls}
                  alt={view.name}
                  className="block w-full transition-opacity duration-200 group-hover:opacity-90"
                />
              </button>
              <p className="truncate px-2.5 pb-2 pt-1.5 text-[12px] tracking-[0.03em] text-ink-3 transition-colors duration-200 group-hover:text-ink-2">
                {view.name}
              </p>
            </ActionCard>
          );
        })}
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
            {editing ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void confirmRename();
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setEditing(false);
                      setRenameError(null);
                    }
                  }}
                  autoFocus
                  aria-label="新文件名"
                  className="w-full max-w-[380px] min-w-0 rounded-ctl border border-white/30 bg-white/10 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void confirmRename()}
                  disabled={saving}
                  className="shrink-0 text-[12px] text-white underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:text-white disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setRenameError(null);
                  }}
                  className="shrink-0 text-[12px] text-white/70 underline decoration-white/25 underline-offset-4 transition-colors duration-150 hover:text-white"
                >
                  取消
                </button>
                {renameError ? (
                  <span className="min-w-0 shrink truncate text-[12px] text-red-300">{renameError}</span>
                ) : null}
              </div>
            ) : (
              <p className="min-w-0 truncate text-[12.5px] tracking-[0.03em] text-white/95">{active.name}</p>
            )}
            <div className="flex shrink-0 items-center gap-4">
              <span className="text-[12px] tabular-nums">
                {current! + 1} / {list.length}
              </span>
              {canEdit && !editing ? (
                <button
                  type="button"
                  onClick={startRename}
                  className="text-[12px] text-white/85 underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:text-white"
                >
                  重命名
                </button>
              ) : null}
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
      <ImageRenameDialog
        open={renameTarget != null}
        initial={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSubmit={async (origin, next) => {
          const result = await performRename(origin, next);
          return result.name;
        }}
      />
      <Toast toast={toast} />
    </>
  );
}
