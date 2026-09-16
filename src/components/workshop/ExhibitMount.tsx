"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@/components/ui/Alert";

type MountFn = (
  el: HTMLElement,
  props?: Record<string, unknown>,
) => void | (() => void) | { unmount?: () => void };

const styled = new Set<string>();

function ensureStyle(href: string) {
  if (styled.has(href)) return;
  if (!document.querySelector(`link[data-exhibit-style="${CSS.escape(href)}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.exhibitStyle = href;
    document.head.appendChild(link);
  }
  styled.add(href);
}

/**
 * 展品宿主：从组件仓库动态取件（原生 ESM），在本页现场渲染。
 * 与仓库侧 ExhibitHost 使用同一份 mount(el, props) 契约。
 */
export default function ExhibitMount({
  moduleUrl,
  styles = [],
  props,
  reloadKey = 0,
}: {
  moduleUrl: string;
  styles?: string[];
  props?: Record<string, unknown>;
  reloadKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setState("loading");
    setError("");

    const bust = (url: string) =>
      reloadKey > 0 ? `${url}${url.includes("?") ? "&" : "?"}fresh=${reloadKey}` : url;

    (async () => {
      try {
        for (const href of styles) ensureStyle(bust(href));
        const mod = (await Promise.race([
          import(/* webpackIgnore: true */ /* turbopackIgnore: true */ bust(moduleUrl)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("取件超时（15 秒）")), 15000),
          ),
        ])) as {
          mount?: MountFn;
          default?: MountFn;
        };
        if (cancelled) return;
        const mount = mod.mount ?? mod.default;
        if (typeof mount !== "function") throw new Error("模块没有导出 mount 函数");
        const el = ref.current;
        if (!el) return;
        el.innerHTML = "";
        const result = await mount(el, props);
        cleanup = typeof result === "function" ? result : result?.unmount;
        setState("ready");
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setError((err as Error).message || String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        cleanup?.();
      } catch {
        // 清理失败不阻断
      }
      if (ref.current) ref.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleUrl, reloadKey]);

  return (
    <div>
      {state === "loading" ? (
        <p className="py-8 text-center text-[12.5px] tracking-[0.04em] text-ink-3">取件中…</p>
      ) : null}
      {state === "error" ? (
        <Alert tone="error" size="sm" className="mb-3">
          展品加载失败：{error}
        </Alert>
      ) : null}
      <div ref={ref} data-exhibit-state={state} className={state === "ready" ? "" : "hidden"} />
    </div>
  );
}
