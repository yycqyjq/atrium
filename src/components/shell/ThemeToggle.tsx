"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/icons";

const STORAGE_KEY = "atrium-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 隐私模式等场景忽略 */
    }
    setDark(next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl border border-line text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-wash hover:text-ink active:translate-y-px"
    >
      <IconMoon className="h-4 w-4 dark:hidden" />
      <IconSun className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
