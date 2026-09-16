"use client";

import { useEffect, useState } from "react";

type Density = "default" | "compact";
const KEY = "atelier-density";

/**
 * 陈列廊密度切换（仅本页生效）：默认 / 紧凑。
 * 通过 #atelier-root 上的 data-density 属性驱动样式调整；选择会记住。
 */
export default function DensityToggle() {
  const [density, setDensity] = useState<Density>("default");

  // 恢复上次选择（仅陈列廊）
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "compact") setDensity("compact");
  }, []);

  useEffect(() => {
    document.getElementById("atelier-root")?.setAttribute("data-density", density);
    window.localStorage.setItem(KEY, density);
  }, [density]);

  const seg = (value: Density, label: string) => (
    <button
      type="button"
      aria-pressed={density === value}
      onClick={() => setDensity(value)}
      className={`rounded-[5px] px-2.5 py-1 text-[12px] tracking-[0.03em] transition-colors duration-150 ${
        density === value ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-3 hover:text-ink-2"
      }`}
    >
      {label}
    </button>
  );

  return (
    <span className="inline-flex items-center gap-0.5 rounded-ctl border border-line bg-raised p-0.5">
      {seg("default", "默认")}
      {seg("compact", "紧凑")}
    </span>
  );
}
