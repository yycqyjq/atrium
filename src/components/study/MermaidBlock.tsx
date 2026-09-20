"use client";

import { useEffect, useRef, useState } from "react";

let seq = 0;

/** ```mermaid 代码块的现场渲染：按需加载 mermaid，跟随 data-theme 重绘，失败回退源码 */
export default function MermaidBlock({ source }: { source: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = document.documentElement.dataset.theme === "dark";
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "neutral",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(`mermaid-${(seq += 1)}`, source);
        if (!cancelled && hostRef.current) {
          hostRef.current.innerHTML = svg;
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    render();
    const mo = new MutationObserver(render);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      mo.disconnect();
    };
  }, [source]);

  if (failed) {
    return (
      <pre className="mermaid-fallback">
        <code>{source}</code>
      </pre>
    );
  }
  return <div ref={hostRef} className="mermaid-host" role="img" aria-label="流程图" />;
}
