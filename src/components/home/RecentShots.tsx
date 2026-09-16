import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import type { Shot } from "@/lib/shots";

type Props = {
  shots: Shot[];
  className?: string;
};

/** 首页「最近在拍」：画廊各相册聚合的最新 8 张，点击直达对应相册灯箱 */
export default function RecentShots({ shots, className = "" }: Props) {
  if (shots.length === 0) return null;

  return (
    <section className={`mt-14 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-5">
        <h2 className="font-serif text-[21px] font-semibold tracking-[0.04em]">最近在拍</h2>
        <Link
          href="/gallery"
          className="group inline-flex items-center gap-[7px] text-[13px] text-ink-3 transition-colors duration-150 hover:text-accent"
        >
          去画廊
          <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-3">
        {shots.map((shot) => (
          <Link
            key={shot.path}
            href={`/gallery?album=${encodeURIComponent(shot.album ?? "")}&view=${shot.index}`}
            className="group block overflow-hidden rounded-ctl border border-line transition-colors duration-200 hover:border-line-strong"
            title={shot.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.url}
              alt={shot.name}
              loading="lazy"
              decoding="async"
              className="block aspect-square w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
