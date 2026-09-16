"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowUpRight } from "@/components/icons";

/** 域名提取（去 www） */
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 站点图标：服务端代理（/api/icon，带磁盘缓存）；失败回退首字方块 */
export function ToolIcon({ host, name }: { host: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  // 视口门控：滚动到附近前不请求站点图标，先以首字方块占位（尺寸不变，无抖动）
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

  const letter = (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-wash font-serif text-[11px] leading-none text-ink-2"
    >
      {name.slice(0, 1)}
    </span>
  );

  if (failed || !host) return letter;

  return (
    <span ref={ref} className="inline-flex size-5 shrink-0">
      {visible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/icon?d=${encodeURIComponent(host)}`}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
          data-tool-icon
          onError={() => setFailed(true)}
          className="size-5 shrink-0 rounded-[5px]"
        />
      ) : (
        letter
      )}
    </span>
  );
}

/** 工具卡片内容：图标 + 名称/域名/描述。工具房列表与陈列廊共用。 */
export function ToolCardContent({
  name,
  url,
  description,
  showArrow = true,
}: {
  name: string;
  url: string;
  description: string;
  showArrow?: boolean;
}) {
  return (
    <span className="flex items-start gap-2.5">
      <ToolIcon host={hostOf(url)} name={name} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
            {name}
          </span>
          {showArrow ? (
            <IconArrowUpRight className="mt-0.5 size-[13px] shrink-0 text-ink-3 transition-colors duration-200 group-hover:text-accent" />
          ) : null}
        </span>
        <span className="mt-0.5 block text-[12px] tracking-[0.03em] text-ink-3">{hostOf(url)}</span>
        <span className="mt-1.5 line-clamp-3 block text-[13px] leading-relaxed text-ink-2">
          {description}
        </span>
      </span>
    </span>
  );
}
