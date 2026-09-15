"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import {
  IconBook,
  IconColumns,
  IconFrame,
  IconHome,
  IconMark,
  IconToolbox,
} from "@/components/icons";

const rooms = [
  { key: "home", href: "/", label: "中庭", icon: IconHome },
  { key: "study", href: "/study", label: "书房", sub: "读", icon: IconBook },
  { key: "gallery", href: "/gallery", label: "画廊", sub: "看", icon: IconFrame },
  { key: "tools", href: "/tools", label: "工具房", sub: "用", icon: IconToolbox },
  { key: "atelier", href: "/atelier", label: "陈列廊", sub: "造", icon: IconColumns },
];

function activeKey(pathname: string): string {
  if (pathname === "/") return "home";
  const first = pathname.split("/")[1] ?? "";
  return rooms.some((r) => r.key === first) ? first : "home";
}

export default function Sidebar() {
  const pathname = usePathname();
  const active = activeKey(pathname);

  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-line-strong bg-surface-sidebar px-5 pt-7 pb-[22px] max-lg:static max-lg:h-auto max-lg:flex-row max-lg:items-center max-lg:gap-4 max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:border-r-0 max-lg:border-b max-lg:border-line max-lg:px-5 max-lg:pt-3 max-lg:pb-3 max-xs:flex-wrap max-xs:content-start max-xs:gap-y-2">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-[10px] px-2 pb-[26px] max-lg:p-0 max-lg:pb-0"
      >
        <IconMark className="h-[26px] w-[26px] text-accent max-lg:h-[22px] max-lg:w-[22px]" />
        <span className="font-serif text-[20px] font-semibold tracking-[0.12em] text-ink mr-[-0.12em] max-lg:text-[17px] max-xs:hidden">
          中庭
        </span>
      </Link>

      <nav
        aria-label="房间导航"
        className="flex grow flex-col gap-[2px] max-lg:flex-row max-lg:grow max-lg:overflow-x-auto max-xs:order-3 max-xs:basis-full"
      >
        {rooms.map((room) => {
          const isActive = room.key === active;
          const Icon = room.icon;
          return (
            <Link
              key={room.key}
              href={room.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-[11px] rounded-ctl px-[10px] py-[9px] text-sm transition-colors duration-150 max-lg:whitespace-nowrap max-lg:px-3 max-lg:py-[7px] ${
                isActive
                  ? "bg-accent-soft font-medium text-accent-ink"
                  : "text-ink-2 hover:bg-wash hover:text-ink"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 max-xs:hidden ${
                  isActive ? "opacity-100" : "opacity-80"
                }`}
              />
              <span className="tracking-[0.03em] max-lg:tracking-normal">{room.label}</span>
              {"sub" in room && (
                <span
                  className={`ml-auto text-[12.5px] tracking-[0.02em] max-lg:hidden ${
                    isActive ? "text-accent-ink opacity-70" : "text-ink-3"
                  }`}
                >
                  {room.sub}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 flex shrink-0 items-center justify-between gap-2 border-t border-line pt-4 max-lg:mt-0 max-lg:border-0 max-lg:p-0 max-xs:order-2 max-xs:ml-auto">
        <div className="flex min-w-0 items-center gap-[9px]">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-[13px] font-semibold text-on-accent"
          >
            Y
          </span>
          <span className="truncate text-[12.5px] text-ink-2 max-lg:hidden">yycqyjq</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
