"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";

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

        // 取件偶发失败（上游抖动、冷启动首连被拒）时自动重试几次：
        // 否则一次瞬时抖动就让整件展品挂掉，只能手动点「刷新」——而刷新本质上就是重试取件。
        const loadOnce = () =>
          Promise.race([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ bust(moduleUrl)),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("取件超时（15 秒）")), 15000),
            ),
          ]) as Promise<{ mount?: MountFn; default?: MountFn }>;

        let mod: { mount?: MountFn; default?: MountFn } | undefined;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            mod = await loadOnce();
            break;
          } catch (err) {
            lastError = err;
            if (cancelled) return;
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
              if (cancelled) return;
            }
          }
        }
        if (!mod) throw lastError;
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
        <div className="py-10">
          <Loading label="取件中…" />
        </div>
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
