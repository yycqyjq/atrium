export const PROVIDER_KEYS = ["github", "gitee"] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export function isProviderKey(value: unknown): value is ProviderKey {
  return typeof value === "string" && (PROVIDER_KEYS as readonly string[]).includes(value);
}

export interface RepoEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
}

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
  content: string;
  encoding: string;
}

export class ProviderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

/**
 * 内容源（Git 托管平台）统一接口。
 * 新增数据源（如 Gitee、GitLab、自建 Gitea）时：
 *   1. 实现本接口；
 *   2. 在 PROVIDER_KEYS 里登记 key；
 *   3. 到 providers/index.ts 的 FACTORIES 注册。
 * 其余业务代码（内容列表、读写、代理）不需要任何改动。
 */
export interface RepoProvider {
  key: ProviderKey;
  label: string;
  apiBase: string;

  /** 仓库配置是否齐全（读取通常只需 owner/repo/branch，写入才需要 token） */
  isConfigured(): Promise<boolean>;
  /** 校验访问令牌并返回登录用户 */
  authStatus(): Promise<{ ok: boolean; user?: string; error?: string }>;

  /** 列目录（dirPath 为空 = 仓库根） */
  listDir(dirPath?: string): Promise<RepoEntry[]>;
  /** 读单文件（content 为 base64） */
  getFile(filePath: string): Promise<RepoFile>;
  /** 写入/更新文件（contentBase64 为 base64；sha 存在 = 更新） */
  putFile(filePath: string, contentBase64: string, message: string, sha?: string): Promise<void>;
  /** 删除文件 */
  deleteFile(filePath: string, message: string, sha: string): Promise<void>;

  /** 文件最后一次提交时间（毫秒），失败返回 null */
  lastCommitDate(filePath: string): Promise<number | null>;
}
