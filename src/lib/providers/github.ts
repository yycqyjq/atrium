import { resolveRepoConfig, type ResolvedRepoConfig } from "@/lib/config";
import {
  ProviderError,
  type RepoEntry,
  type RepoFile,
  type RepoProvider,
} from "./types";

export async function githubProvider(override?: ResolvedRepoConfig): Promise<RepoProvider> {
  const cfg = override ?? (await resolveRepoConfig("github"));
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
      // 硬超时：上游卡住时快速失败（由缓存回退兜底），不再拖垮页面
      signal: init?.signal ?? AbortSignal.timeout(20000),
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
      await call(`/repos/${repoPath}/contents/${encodeURI(filePath)}`, {
        method: "PUT",
        signal: AbortSignal.timeout(90000),
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
        signal: AbortSignal.timeout(90000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sha, branch: cfg.branch }),
      });
    },

    async renameFile(oldPath, newPath, message) {
      // Git 数据 API：复用原 blob（内容不搬运），一次提交完成「新路径 + 删除旧路径」。
      // 分支指针若在期间前进（并发写），自动重试。
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const headRes = await call(`/repos/${repoPath}/git/ref/heads/${ref}`);
        const head = (await headRes.json()) as { object?: { sha?: string } };
        const headSha = head.object?.sha;
        if (!headSha) throw new ProviderError(500, "拿不到分支指针");
        const commitRes = await call(`/repos/${repoPath}/git/commits/${headSha}`);
        const commit = (await commitRes.json()) as { tree?: { sha?: string } };
        const treeSha = commit.tree?.sha;
        if (!treeSha) throw new ProviderError(500, "拿不到目录树");

        const fileRes = await call(`/repos/${repoPath}/contents/${encodeURI(oldPath)}?ref=${ref}`);
        const fileData = (await fileRes.json()) as { sha?: string; type?: string };
        if (fileData.type === "dir" || !fileData.sha) {
          throw new ProviderError(404, `不是文件：${oldPath}`);
        }

        const treeRes = await call(`/repos/${repoPath}/git/trees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_tree: treeSha,
            tree: [
              { path: newPath, mode: "100644", type: "blob", sha: fileData.sha },
              { path: oldPath, mode: "100644", type: "blob", sha: null },
            ],
          }),
        });
        const newTree = (await treeRes.json()) as { sha?: string };
        if (!newTree.sha) throw new ProviderError(500, "创建目录树失败");

        const commitCreate = await call(`/repos/${repoPath}/git/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }),
        });
        const newCommit = (await commitCreate.json()) as { sha?: string };
        if (!newCommit.sha) throw new ProviderError(500, "创建提交失败");

        try {
          await call(`/repos/${repoPath}/git/refs/heads/${ref}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sha: newCommit.sha, force: false }),
          });
          return;
        } catch (err) {
          if (err instanceof ProviderError && (err.status === 409 || err.status === 422)) {
            continue; // 分支在期间前进，重来
          }
          throw err;
        }
      }
      throw new ProviderError(409, "仓库更新频繁，请稍后重试");
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
        // 主源：jsDelivr 国内线路（对 raw 不稳定的网络环境更可靠；分支内容有短时缓存）
        `https://gcore.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${encoded}`,
        // 备用：GitHub raw（永远最新，但部分网络环境不稳）
        `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${encodeURIComponent(cfg.branch)}/${encoded}`,
      ];
    },
  };
}
