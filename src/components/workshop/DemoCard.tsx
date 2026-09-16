import Link from "next/link";
import { IconArrowRight, IconExternal } from "@/components/icons";

/** 更新时间的轻量展示：今天显示「今日更新」，否则「X月X日更新」 */
export function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "今日更新";
  return `${d.getMonth() + 1}月${d.getDate()}日更新`;
}
import type { DemoProject } from "@/lib/config";
import type { DemoItem } from "@/lib/demos";

/** 展品卡：点进现场渲染的详情页 */
export function DemoCard({ item }: { item: DemoItem }) {
  return (
    <Link
      href={`/workshop/${item.projectId}/${item.id}`}
      className="group block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
          {item.title}
        </span>
        <IconArrowRight className="mt-0.5 size-[13px] shrink-0 text-ink-3 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
      </span>
      {item.desc ? (
        <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-3 line-clamp-2">
          {item.desc}
        </span>
      ) : null}
      <span className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.04em] text-ink-3">
        {item.origin ? (
          <span className="rounded-[3px] border border-line px-1.5 py-px text-[10px] tracking-[0.06em]">
            {item.origin}
          </span>
        ) : null}
        <span>{item.projectName}</span>
        {item.group ? <span aria-hidden>·</span> : null}
        {item.group ? <span>{item.group}</span> : null}
        {item.updatedAt ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-accent/80">{formatUpdated(item.updatedAt)}</span>
          </>
        ) : null}
      </span>
    </Link>
  );
}

/** 线上站点卡：外部地址，新窗口打开 */
export function LinkProjectCard({ project }: { project: DemoProject }) {
  const url = project.url ?? "";
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
          {project.name}
        </span>
        <IconExternal className="mt-0.5 size-[13px] shrink-0 text-ink-3 transition-colors duration-200 group-hover:text-accent" />
      </span>
      {project.desc ? (
        <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-3 line-clamp-2">
          {project.desc}
        </span>
      ) : null}
      <span className="mt-2.5 flex items-center gap-2 text-[11px] tracking-[0.04em] text-ink-3">
        <span>外部站点</span>
        <span aria-hidden>·</span>
        <span>新窗口打开</span>
      </span>
    </a>
  );
}
