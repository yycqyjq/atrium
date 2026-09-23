"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import {
  IconBook,
  IconColumns,
  IconCraft,
  IconFrame,
  IconGear,
  IconHome,
  IconMark,
  IconSearch,
  IconToolbox,
} from "@/components/icons";

const rooms = [
  { key: "home", href: "/", label: "中庭", icon: IconHome },
  { key: "study", href: "/study", label: "书房", sub: "读", icon: IconBook },
  { key: "gallery", href: "/gallery", label: "画廊", sub: "看", icon: IconFrame },
  { key: "tools", href: "/tools", label: "工具房", sub: "用", icon: IconToolbox },
  { key: "workshop", href: "/workshop", label: "工坊", sub: "试", icon: IconCraft },
  { key: "atelier", href: "/atelier", label: "陈列廊", sub: "造", icon: IconColumns },
];

function activeKey(pathname: string): string {
  if (pathname === "/") return "home";
  const first = pathname.split("/")[1] ?? "";
  return rooms.some((r) => r.key === first) ? first : "home";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [account, setAccount] = useState({ connected: true, owner: "" });
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        const gh = d?.repos?.github;
        setAccount({
          connected: Boolean(gh?.tokenSet && gh?.owner && gh?.repo),
          owner: String(gh?.owner ?? ""),
        });
      })
      .catch(() => {});
  }, []);
  const active = activeKey(pathname);

  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-line-strong bg-surface-sidebar px-5 pt-7 pb-[22px] max-shell:static max-shell:h-auto max-shell:flex-row max-shell:items-center max-shell:gap-4 max-shell:overflow-x-auto max-shell:overflow-y-hidden max-shell:border-r-0 max-shell:border-b max-shell:border-line max-shell:px-5 max-shell:pt-3 max-shell:pb-3 max-xs:flex-wrap max-xs:content-start max-xs:gap-y-2">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-[10px] px-2 pb-[26px] max-shell:p-0 max-shell:pb-0"
      >
        <IconMark className="h-[26px] w-[26px] text-accent max-shell:h-[22px] max-shell:w-[22px]" />
        <span className="font-serif text-[20px] font-semibold tracking-[0.12em] text-ink mr-[-0.12em] max-shell:text-[17px] max-xs:hidden">
          中庭
        </span>
      </Link>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("atrium:search"))}
        className="mb-3 flex items-center gap-2.5 rounded-ctl px-2.5 py-2 text-[13px] tracking-[0.02em] text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-ink max-shell:mb-0 max-shell:shrink-0"
      >
        <IconSearch className="h-[15px] w-[15px] shrink-0" />
        <span>搜索</span>
        <span className="ml-auto rounded border border-line px-1.5 py-px text-[10.5px] max-shell:hidden">
          ⌘K
        </span>
      </button>

      <nav
        aria-label="房间导航"
        className="flex grow flex-col gap-[2px] max-shell:flex-row max-shell:grow max-shell:overflow-x-auto max-xs:order-3 max-xs:basis-full"
      >
        {rooms.map((room) => {
          const isActive = room.key === active;
          const Icon = room.icon;
          return (
            <Link
              key={room.key}
              href={room.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-[11px] rounded-ctl px-[10px] py-[9px] text-sm transition-colors duration-150 max-shell:whitespace-nowrap max-shell:px-3 max-shell:py-[7px] ${
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
              <span className="tracking-[0.03em] max-shell:tracking-normal">{room.label}</span>
              {"sub" in room && (
                <span
                  className={`ml-auto text-[12.5px] tracking-[0.02em] max-shell:hidden ${
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

      <div className="mt-5 flex shrink-0 items-center justify-between gap-2 border-t border-line pt-4 max-shell:mt-0 max-shell:border-0 max-shell:p-0 max-xs:order-2 max-xs:ml-auto">
        <Link
          href="/connect"
          title={
            account.connected
              ? `已连接 ${account.owner || "账号"}，点击管理`
              : "未连接，点击配置账号与仓库"
          }
          className="flex min-w-0 items-center gap-[9px] rounded-ctl px-1 py-0.5 transition-colors duration-150 hover:bg-wash"
        >
          <span
            aria-hidden
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-[13px] font-semibold ${
              account.connected
                ? "bg-accent text-on-accent"
                : "border border-dashed border-line-strong text-ink-3"
            }`}
          >
            {account.connected
              ? account.owner
                ? account.owner.charAt(0).toUpperCase()
                : "·"
              : "·"}
          </span>
          <span className="truncate text-[12.5px] text-ink-2 max-shell:hidden">
            {account.connected ? account.owner || "已连接" : "连接仓库"}
          </span>
        </Link>
        <span className="flex items-center gap-0.5">
          <Link
            href="/guide"
            title="使用教程"
            aria-label="使用教程"
            className="rounded-ctl p-1.5 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-ink-2"
          >
            <IconBook className="size-[15px]" />
          </Link>
          <Link
            href="/connect"
            title="账号与设置"
            aria-label="账号与设置"
            className="rounded-ctl p-1.5 text-ink-3 transition-colors duration-150 hover:bg-wash hover:text-ink-2"
          >
            <IconGear className="size-[15px]" />
          </Link>
          <ThemeToggle />
        </span>
      </div>
    </aside>
  );
}
