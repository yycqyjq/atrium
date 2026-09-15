"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 连接仓库表单：读写 config.json 的 repos.github（token 只写不显）。
 * 保存成功后刷新全站——书房/画廊/工具房/写作台立即点亮。
 */
export default function ConnectDesk({
  initial,
}: {
  initial: { owner: string; repo: string; branch: string; tokenSet: boolean };
}) {
  const router = useRouter();
  const [owner, setOwner] = useState(initial.owner);
  const [repo, setRepo] = useState(initial.repo);
  const [branch, setBranch] = useState(initial.branch || "main");
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const field = "w-full rounded-ctl border border-line bg-raised px-3.5 py-2.5 text-[13.5px] outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent";
  const label = "mb-1.5 block text-[11.5px] tracking-[0.1em] text-ink-3";

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        repos: {
          github: {
            owner: owner.trim(),
            repo: repo.trim(),
            branch: branch.trim() || "main",
            ...(token.trim() ? { token: token.trim() } : {}),
          },
        },
      };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { repos?: Record<string, { tokenSet?: boolean }>; error?: string };
      if (!res.ok || data.error) {
        setState("error");
        setMessage(data.error ?? "保存失败，请稍后再试");
        return;
      }
      setState("ok");
      setMessage(
        data.repos?.github?.tokenSet
          ? "已连接。回到书房、画廊、工具房，内容已经亮起来。"
          : "已保存。尚未填令牌：可以先浏览，写作与上传需要令牌。",
      );
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  return (
    <div className="rounded-ctl border border-line bg-raised p-5 md:p-6">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor="conn-owner">GitHub 用户名</label>
          <input id="conn-owner" className={field} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="yycqyjq" />
        </div>
        <div>
          <label className={label} htmlFor="conn-repo">内容仓库名</label>
          <input id="conn-repo" className={field} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="ark-notes" />
        </div>
        <div>
          <label className={label} htmlFor="conn-branch">分支</label>
          <input id="conn-branch" className={field} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
        </div>
        <div>
          <label className={label} htmlFor="conn-token">
            访问令牌 {initial.tokenSet ? "（已设置，留空则保持不变）" : ""}
          </label>
          <input
            id="conn-token"
            type="password"
            className={field}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={initial.tokenSet ? "••••••••••••" : "ghp_… 或 gho_…"}
            autoComplete="off"
          />
        </div>
      </div>

      <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3">
        令牌只保存在本机配置文件（权限 600），用于读写你的仓库；生成入口
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noreferrer"
          className="mx-1 text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover"
        >
          GitHub Settings → Tokens
        </a>
        ，勾选 repo 读权限即可。画廊默认另用图床仓库，可在配置文件里通过 galleryRepo 指定。
      </p>

      {state === "error" || state === "ok" ? (
        <p
          className={`mb-4 rounded-ctl border px-4 py-2.5 text-[13px] ${
            state === "error"
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line bg-surface text-ink-2"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={state === "saving" || !owner.trim() || !repo.trim()}
        className="rounded-ctl bg-accent px-5 py-2.5 text-[13.5px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === "saving" ? "连接中…" : "保存并连接"}
      </button>
    </div>
  );
}
