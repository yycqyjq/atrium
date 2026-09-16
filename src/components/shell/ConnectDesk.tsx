"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Field";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

/**
 * 连接仓库表单：读写 config.json 的 repos.github（token 只写不显）。
 * 保存成功后刷新全站——书房/画廊/工具房/写作台立即点亮。
 */
export default function ConnectDesk({
  initial,
}: {
  initial: {
    owner: string;
    repo: string;
    branch: string;
    tokenSet: boolean;
    galleryRepo?: string;
    galleryBranch?: string;
  };
}) {
  const router = useRouter();
  const [owner, setOwner] = useState(initial.owner);
  const [repo, setRepo] = useState(initial.repo);
  const [branch, setBranch] = useState(initial.branch || "main");
  const [token, setToken] = useState("");
  const [galleryRepo, setGalleryRepo] = useState(initial.galleryRepo ?? "");
  const [galleryBranch, setGalleryBranch] = useState(initial.galleryBranch ?? "main");
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

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
        galleryRepo: galleryRepo.trim()
          ? { owner: owner.trim(), repo: galleryRepo.trim(), branch: galleryBranch.trim() || "main" }
          : "",
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
    <Card className="bg-raised">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="conn-owner">GitHub 用户名</FieldLabel>
          <Input id="conn-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="yycqyjq" />
        </div>
        <div>
          <FieldLabel htmlFor="conn-token">
            访问令牌 {initial.tokenSet ? "（已设置，留空则保持不变）" : ""}
          </FieldLabel>
          <Input
            id="conn-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={initial.tokenSet ? "••••••••••••" : "ghp_… 或 gho_…"}
            autoComplete="off"
          />
        </div>
        <div>
          <FieldLabel htmlFor="conn-repo">内容仓库名</FieldLabel>
          <Input id="conn-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="ark-notes" />
        </div>
        <div>
          <FieldLabel htmlFor="conn-branch">分支</FieldLabel>
          <Input id="conn-branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
        </div>
        <div>
          <FieldLabel htmlFor="conn-gallery">画廊仓库名（可选）</FieldLabel>
          <Input
            id="conn-gallery"
            value={galleryRepo}
            onChange={(e) => setGalleryRepo(e.target.value)}
            placeholder="不填则跟随内容仓库"
          />
        </div>
        <div>
          <FieldLabel htmlFor="conn-gbranch">画廊分支</FieldLabel>
          <Input
            id="conn-gbranch"
            value={galleryBranch}
            onChange={(e) => setGalleryBranch(e.target.value)}
            placeholder="main"
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
        <Alert tone={state === "error" ? "error" : "ok"} className="mb-4">{message}</Alert>
      ) : null}

      <Button onClick={save} disabled={state === "saving" || !owner.trim() || !repo.trim()}>
        {state === "saving" ? "连接中…" : "保存并连接"}
      </Button>
    </Card>
  );
}
