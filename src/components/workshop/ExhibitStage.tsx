"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { IconExternal } from "@/components/icons";
import ExhibitMount from "./ExhibitMount";

/**
 * 展品舞台：预览 / 源码 双页签；预览支持刷新（绕过取件缓存）。
 */
export default function ExhibitStage({
  moduleUrl,
  styles = [],
  props,
  meta,
  source,
  githubUrl,
}: {
  moduleUrl: string;
  styles?: string[];
  props?: Record<string, unknown>;
  meta: string;
  source: string | null;
  githubUrl: string | null;
}) {
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [reloadKey, setReloadKey] = useState(0);
  const [wide, setWide] = useState(false);

  // 宽屏模式：放宽中庭主容器，给展品预览更多空间（记忆偏好）
  useEffect(() => {
    setWide(localStorage.getItem("exhibit-stage-wide") === "1");
  }, []);
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    if (wide) main.setAttribute("data-wide", "1");
    else main.removeAttribute("data-wide");
    return () => main.removeAttribute("data-wide");
  }, [wide]);
  const toggleWide = () => {
    const next = !wide;
    setWide(next);
    localStorage.setItem("exhibit-stage-wide", next ? "1" : "0");
  };

  const tabCls = (active: boolean) =>
    `rounded-[5px] px-3 py-1 text-[12px] tracking-[0.03em] transition-colors duration-150 ${
      active ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-3 hover:text-ink-2"
    }`;

  return (
    <Card padding="none" className="bg-raised">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <span className="inline-flex items-center gap-0.5 rounded-ctl border border-line p-0.5">
          <button type="button" onClick={() => setTab("preview")} className={tabCls(tab === "preview")}>
            预览
          </button>
          <button type="button" onClick={() => setTab("source")} className={tabCls(tab === "source")}>
            源码
          </button>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-[11.5px] tracking-[0.04em] text-ink-3">{meta}</span>
          <button
            type="button"
            onClick={toggleWide}
            className={`rounded-[5px] px-3 py-1 text-[12px] tracking-[0.03em] transition-colors duration-150 ${
              wide ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            宽屏
          </button>
          {tab === "preview" ? (
            <Button variant="quiet" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
              刷新
            </Button>
          ) : null}
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors duration-150 hover:text-accent"
            >
              在 GitHub 打开
              <IconExternal className="h-3 w-3" />
            </a>
          ) : null}
        </span>
      </div>

      {tab === "preview" ? (
        <div className="px-3 pb-3">
          <ExhibitMount moduleUrl={moduleUrl} styles={styles} props={props} reloadKey={reloadKey} />
        </div>
      ) : source ? (
        <pre className="mx-3 mb-3 max-h-[560px] overflow-auto rounded-ctl border border-line bg-surface px-4 py-3.5 font-mono text-[12px] leading-relaxed text-ink-2">
          {source}
        </pre>
      ) : (
        <p className="py-6 text-center text-[12.5px] text-ink-3">这个展品没有可读源码。</p>
      )}
    </Card>
  );
}
