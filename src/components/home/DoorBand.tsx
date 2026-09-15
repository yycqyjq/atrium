import Link from "next/link";
import { IconArrowRight } from "@/components/icons";

const doors = [
  { href: "/study", plate: "读", name: "书房", desc: "文章与长文。慢慢读，慢慢写。" },
  { href: "/gallery", plate: "看", name: "画廊", desc: "照片与影像。存放目光的地方。" },
  { href: "/tools", plate: "用", name: "工具房", desc: "书签与常用工具。顺手就能拿到。" },
  { href: "/atelier", plate: "造", name: "陈列廊", desc: "组件与实验。作品的小展台。" },
];

export default function DoorBand({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="房间入口"
      className={`grid grid-cols-[1.28fr_1fr_1fr_0.88fr] border-y border-line-strong max-xs:grid-cols-1 ${className}`}
    >
      {doors.map((door, i) => (
        <Link
          key={door.href}
          href={door.href}
          className={`group flex min-h-[178px] flex-col gap-3 pt-[26px] pb-7 transition-colors duration-200 hover:bg-wash max-xs:min-h-0 max-xs:px-0 max-xs:py-5 ${
            i === 0 ? "pr-6 pl-0" : "px-6"
          } ${i > 0 ? "border-l border-line max-xs:border-t max-xs:border-l-0" : ""}`}
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-ctl border border-line-strong font-serif text-[13px] text-ink-2 transition-colors duration-200 group-hover:border-accent group-hover:bg-accent-soft group-hover:text-accent-ink"
            >
              {door.plate}
            </span>
            <span className="font-serif text-[20px] tracking-[0.05em] text-ink">
              {door.name}
            </span>
          </span>
          <span className="max-w-[15em] text-[13px] leading-[1.65] text-ink-3 text-balance [word-break:keep-all] max-xs:max-w-none">
            {door.desc}
          </span>
          <span
            aria-hidden
            className="mt-auto text-accent opacity-65 transition-all duration-200 group-hover:translate-x-[3px] group-hover:opacity-100 max-xs:mt-1 max-xs:translate-x-0 max-xs:opacity-100"
          >
            <IconArrowRight className="h-[18px] w-[18px]" />
          </span>
        </Link>
      ))}
    </section>
  );
}
