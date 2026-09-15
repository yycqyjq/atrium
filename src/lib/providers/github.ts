import { resolveRepoConfig } from "@/lib/config";
import {
  ProviderError,
  type RepoEntry,
  type RepoFile,
  type RepoProvider,
} from "./types";

export async function githubProvider(): Promise<RepoProvider> {
  const cfg = await resolveRepoConfig("github");
  const configured = Boolean(cfg.owner && cfg.repo);

  const call = async (apiPath: string, init?: RequestInit): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "atrium",
    };
    if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;

    const res = await fetch(`https://api.github.com${apiPath}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(res.status, `GitHub ${res.status}: ${detail.slice(0, 180)}`);
    }
    return res;
  };

  const repoPath = `${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
  const ref = encodeURIComponent(cfg.branch);

  return {
    key: "github",
    label: "GitHub",
    apiBase: "https://api.github.com",

    async isConfigured() {
      return configured;
    },

    async authStatus() {
      if (!configured) return { ok: false, error: "尚未配置仓库" };
      try {
        const res = await call("/user");
        const user = (await res.json()) as { login?: string };
        return { ok: true, user: user.login };
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
      const data = (await res.json()) as Record<string, unknown>;
      return {
        name: String(data.name ?? ""),
        path: String(data.path ?? filePath),
        sha: String(data.sha ?? ""),
        content: String(data.content ?? ""),
        encoding: String(data.encoding ?? "base64"),
      };
    },

    async putFile(filePath, contentBase64, message, sha) {
      await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: contentBase64,
          branch: cfg.branch,
          ...(sha ? { sha } : {}),
        }),
      });
    },

    async deleteFile(filePath, message, sha) {
      await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sha, branch: cfg.branch }),
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
  };
}
