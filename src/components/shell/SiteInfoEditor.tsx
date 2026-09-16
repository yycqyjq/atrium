"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Field";

/** 设置页「站点信息」：站名 / 门厅副标题 / 页脚文案 */
export default function SiteInfoEditor({
  initial,
}: {
  initial: { siteName: string; siteSubtitle: string; footerText: string };
}) {
  const [siteName, setSiteName] = useState(initial.siteName);
  const [siteSubtitle, setSiteSubtitle] = useState(initial.siteSubtitle);
  const [footerText, setFooterText] = useState(initial.footerText);
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName, siteSubtitle, footerText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("ok");
      setMessage("已保存。站名、副标题、页脚都会随之更新。");
    } catch (err) {
      setState("error");
      setMessage((err as Error).message || "保存失败");
    }
  }

  return (
    <Card className="bg-raised">
      <p className="mb-1 font-serif text-[15px] tracking-[0.02em]">站点信息</p>
      <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3">
        站名显示在浏览器标签页；副标题在门厅问候语下方；页脚文案显示在各页底部。留空则用默认值。
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="site-name">站名</FieldLabel>
          <Input
            id="site-name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="中庭"
          />
        </div>
        <div>
          <FieldLabel htmlFor="site-subtitle">门厅副标题</FieldLabel>
          <Input
            id="site-subtitle"
            value={siteSubtitle}
            onChange={(e) => setSiteSubtitle(e.target.value)}
            placeholder="慢慢看，慢慢写。"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="site-footer">页脚文案</FieldLabel>
          <Input
            id="site-footer"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="中庭是个人空间，内容存放在你的代码仓库里。"
          />
        </div>
      </div>

      {state === "ok" && message ? (
        <Alert tone="ok" size="sm" className="mt-4">
          {message}
        </Alert>
      ) : null}
      {state === "error" && message ? (
        <Alert tone="error" size="sm" className="mt-4">
          {message}
        </Alert>
      ) : null}

      <div className="mt-5">
        <Button onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "保存中…" : "保存站点信息"}
        </Button>
      </div>
    </Card>
  );
}
