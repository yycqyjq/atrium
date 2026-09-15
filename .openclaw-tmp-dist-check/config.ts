import { promises as fs } from "node:fs";
import path from "node:path";
import { PROVIDER_KEYS, isProviderKey, type ProviderKey } from "./providers/types";

export type RepoConfig = {
  owner?: string;
  repo?: string;
  branch?: string;
  token?: string;
};

export type StoredConfig = {
  siteName?: string;
  siteTitle?: string;
  siteSubtitle?: string;
  footerText?: string;
  aboutBio?: string;
  skills?: string[];
  defaultProvider?: ProviderKey;
  repos?: Partial<Record<ProviderKey, RepoConfig>>;
  /** 画廊独立仓库（缺省跟随主仓库） */
  galleryRepo?: RepoConfig;
  /** 画廊根目录（缺省 images/；空字符串 = 仓库根） */
  galleryDir?: string;
};

const DATA_DIR = process.env.ATRIUM_DATA_DIR || path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

/** 轻量读取缓存：写配置时立即失效 */
const CACHE_TTL = 2000;
let cache: { at: number; value: StoredConfig } | null = null;

export async function readStoredConfig(): Promise<StoredConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.value;
  let value: StoredConfig = {};
  try {
    value = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as StoredConfig;
  } catch {
    value = {};
  }
  cache = { at: Date.now(), value };
  return value;
}

/** 每家内容源对应的环境变量名（优先级：环境变量 > data/config.json） */
const ENV_FIELDS: Record<ProviderKey, { owner: string; repo: string; branch: string; token: string }> = {
  github: {
    owner: "GITHUB_OWNER",
    repo: "GITHUB_REPO",
    branch: "GITHUB_BRANCH",
    token: "GITHUB_TOKEN",
  },
  gitee: {
    owner: "GITEE_OWNER",
    repo: "GITEE_REPO",
    branch: "GITEE_BRANCH",
    token: "GITEE_TOKEN",
  },
};

export type ResolvedRepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

export async function resolveRepoConfig(key: ProviderKey): Promise<ResolvedRepoConfig> {
  const stored = (await readStoredConfig()).repos?.[key] ?? {};
  const envNames = ENV_FIELDS[key];
  const pick = (envName: string, storedValue?: string): string =>
    (process.env[envName] ?? storedValue ?? "").trim();

  return {
    owner: pick(envNames.owner, stored.owner),
    repo: pick(envNames.repo, stored.repo),
    branch: pick(envNames.branch, stored.branch) || "main",
    token: pick(envNames.token, stored.token),
  };
}

export async function defaultProviderKey(): Promise<ProviderKey> {
  const fromEnv = process.env.ATRIUM_DEFAULT_PROVIDER;
  if (isProviderKey(fromEnv)) return fromEnv;
  return (await readStoredConfig()).defaultProvider ?? "github";
}

/** 画廊根目录：环境变量 > config.json > 缺省 images/；空字符串表示仓库根 */
export async function galleryDir(): Promise<string> {
  const fromEnv = process.env.ATRIUM_GALLERY_DIR;
  if (fromEnv != null) return fromEnv.replace(/^\/+|\/+$/g, "");
  const stored = (await readStoredConfig()).galleryDir;
  if (stored != null) return stored.replace(/^\/+|\/+$/g, "");
  return "images";
}

/** 面向客户端的安全视图：绝不返回 token 原文 */
export function publicConfig(cfg: StoredConfig) {
  const repos: Record<
    string,
    { owner?: string; repo?: string; branch?: string; tokenSet: boolean }
  > = {};
  for (const key of PROVIDER_KEYS) {
    const repo = cfg.repos?.[key];
    repos[key] = {
      owner: repo?.owner,
      repo: repo?.repo,
      branch: repo?.branch,
      tokenSet: Boolean(repo?.token),
    };
  }
  return {
    siteName: cfg.siteName,
    siteTitle: cfg.siteTitle,
    siteSubtitle: cfg.siteSubtitle,
    footerText: cfg.footerText,
    aboutBio: cfg.aboutBio,
    skills: cfg.skills ?? [],
    defaultProvider: cfg.defaultProvider ?? "github",
    repos,
  };
}

export async function readPublicConfig() {
  return publicConfig(await readStoredConfig());
}

const WRITABLE_SCALARS = [
  "siteName",
  "siteTitle",
  "siteSubtitle",
  "footerText",
  "aboutBio",
] as const;

/** 合并式写入（不做整体覆盖，避免意外丢字段） */
export async function updateConfig(input: Record<string, unknown>) {
  const current = await readStoredConfig();
  const next: StoredConfig = { ...current };

  for (const key of WRITABLE_SCALARS) {
    if (key in input && typeof input[key] === "string") next[key] = input[key] as string;
  }
  if (Array.isArray(input.skills)) {
    next.skills = input.skills.filter((s): s is string => typeof s === "string");
  }
  const wanted = input.defaultProvider;
  if (typeof wanted === "string" && (PROVIDER_KEYS as readonly string[]).includes(wanted)) {
    next.defaultProvider = wanted as ProviderKey;
  }
  if (input.repos && typeof input.repos === "object") {
    const repos = { ...(current.repos ?? {}) };
    for (const [key, value] of Object.entries(input.repos as Record<string, unknown>)) {
      if (!(PROVIDER_KEYS as readonly string[]).includes(key)) continue;
      if (typeof value !== "object" || value === null) continue;
      const source = value as Record<string, unknown>;
      const merged: RepoConfig = { ...repos[key as ProviderKey] };
      for (const field of ["owner", "repo", "branch", "token"] as const) {
        if (typeof source[field] === "string") merged[field] = source[field] as string;
      }
      repos[key as ProviderKey] = merged;
    }
    next.repos = repos;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  cache = null;
  return publicConfig(next);
}

/** 首页常用入口：GitHub 账号主页 */
export async function githubProfileUrl(): Promise<string> {
  const cfg = await resolveRepoConfig("github");
  return cfg.owner ? `https://github.com/${cfg.owner}` : "https://github.com";
}

/**
 * 画廊仓库：优先 GITHUB_GALLERY_* / GITEE_GALLERY_*（按默认内容源选择前缀），
 * 其次 config.json 的 galleryRepo，未设置时落到默认内容源的主仓库。
 */
export async function resolveGalleryConfig(): Promise<{ provider: ProviderKey } & ResolvedRepoConfig> {
  const provider = await defaultProviderKey();
  const base = await resolveRepoConfig(provider);
  const stored = await readStoredConfig();
  const gallery = stored.galleryRepo ?? {};
  const prefix = provider === "gitee" ? "GITEE_GALLERY" : "GITHUB_GALLERY";
  const pick = (envName: string, storedValue?: string, fallback?: string) =>
    (process.env[envName] ?? storedValue ?? fallback ?? "").trim();
  return {
    provider,
    owner: pick(`${prefix}_OWNER`, gallery.owner, base.owner),
    repo: pick(`${prefix}_REPO`, gallery.repo, base.repo),
    branch: pick(`${prefix}_BRANCH`, gallery.branch, base.branch) || "main",
    token: pick(`${prefix}_TOKEN`, gallery.token, base.token),
  };
}
