import { resolveRepoConfig, type ResolvedRepoConfig } from "@/lib/config";
import {
  ProviderError,
  type RepoEntry,
  type RepoFile,
  type RepoProvider,
} from "./types";

/**
 * Gitee 实现【实验性】。
 * 接口形状对齐 GitHub Contents API，便于「多内容源」扩展：
 * 配置 GITEE_OWNER / GITEE_REPO / GITEE_BRANCH / GITEE_TOKEN（或写入 data/config.json）。
 * 注意：Gitee OpenAPI 与 GitHub 存在细节差异，首次接入时请先用 /api/providers 验证连通性。
 */
export async function giteeProvider(override?: ResolvedRepoConfig): Promise<RepoProvider> {
  const cfg = override ?? (await resolveRepoConfig("gitee"));
  const configured = Boolean(cfg.owner && cfg.repo);

  const call = async (apiPath: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(`https://gitee.com/api/v5${apiPath}`);
    if (cfg.token) url.searchParams.set("access_token", cfg.token);

    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(res.status, `Gitee ${res.status}: ${detail.slice(0, 180)}`);
    }
    return res;
  };

  const repoPath = `${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
  const ref = encodeURIComponent(cfg.branch);

  return {
    key: "gitee",
    label: "Gitee",
    apiBase: "https://gitee.com/api/v5",

    async isConfigured() {
      return configured;
    },

    async authStatus() {
      if (!configured) return { ok: false, error: "尚未配置仓库" };
      try {
        const res = await call("/user");
        const user = (await res.json()) as { login?: string; name?: string };
        return { ok: true, user: user.login ?? user.name };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },

    async listDir(dirPath = ""): Promise<RepoEntry[]> {
      const clean = dirPath.replace(/^\/+/, "");
      const res = await call(`/repos/${repoPath}/contents/${encodeURI(clean)}?ref=${ref}`);
      const data: unknown = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      return (arr as Array<Record<string, unknown>>).map((entry) => ({
        name: String(entry.name ?? ""),
        path: String(entry.path ?? ""),
        type: entry.type === "dir" ? ("dir" as const) : ("file" as const),
        sha: String(entry.sha ?? ""),
        size: typeof entry.size === "number" ? entry.size : undefined,
      }));
    },

    async getFile(filePath): Promise<RepoFile> {
      const res = await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}?ref=${ref}`);
      const data: unknown = await res.json();
      // 目录会返回数组：对 getFile 语义而言等同「不存在」，抛 404 让调用方走目录分支
      if (Array.isArray(data) || (data as Record<string, unknown>).type === "dir") {
        throw new ProviderError(404, `不是文件：${filePath}`);
      }
      const file = data as Record<string, unknown>;
      return {
        name: String(file.name ?? ""),
        path: String(file.path ?? filePath),
        sha: String(file.sha ?? ""),
        content: String(file.content ?? ""),
        encoding: String(file.encoding ?? "base64"),
      };
    },

    async putFile(filePath, contentBase64, message, sha) {
      // Gitee：创建用 POST，更新（带 sha）用 PUT
      await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}`, {
        method: sha ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentBase64,
          message,
          branch: cfg.branch,
          ...(sha ? { sha } : {}),
        }),
      });
    },

    async deleteFile(filePath, message, sha) {
      await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha, message, branch: cfg.branch }),
      });
    },

    async lastCommitDate(filePath) {
      try {
        const res = await call(
          `/repos/${repoPath}/commits?path=${encodeURIComponent(filePath)}&sha=${ref}&per_page=1`,
        );
        const arr = (await res.json()) as Array<{
          commit?: { committer?: { date?: string } };
        }>;
        const iso = arr[0]?.commit?.committer?.date;
        return iso ? Date.parse(iso) : null;
      } catch {
        return null;
      }
    },

    rawUrl(filePath: string) {
      const encoded = encodeURI(filePath).replace(/#/g, "%23").replace(/\?/g, "%3F");
      const primary = `https://gcore.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${encoded}`;
      return primary;
    },

    rawUrlCandidates(filePath: string) {
      const encoded = encodeURI(filePath).replace(/#/g, "%23").replace(/\?/g, "%3F");
      return [
        // 主源：jsDelivr 国内线路；备用：Gitee raw
        `https://gcore.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${encoded}`,
        `https://gitee.com/${cfg.owner}/${cfg.repo}/raw/${encodeURIComponent(cfg.branch)}/${encoded}`,
      ];
    },
  };
}
