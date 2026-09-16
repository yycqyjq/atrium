import { promises as fs } from "node:fs";
import path from "node:path";
import { PROVIDER_KEYS, isProviderKey, type ProviderKey } from "./providers/types";

export type RepoConfig = {
  owner?: string;
  repo?: string;
  branch?: string;
  token?: string;
};

/** 工坊「组件项目」：一个仓库（取件渲染）或一个线上站点（外链） */
export type DemoProject = {
  id: string;
  name: string;
  kind: "repo" | "url";
  /** kind=repo：owner/名字 */
  repo?: string;
  /** kind=repo：分支（缺省 main） */
  branch?: string;
  /** kind=repo：清单目录（缺省仓库根，清单文件 atrium.json） */
  dir?: string;
  /** kind=url：外部地址 */
  url?: string;
  desc?: string;
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
  /** 工坊的组件项目列表 */
  demoProjects?: DemoProject[];
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

const DEMO_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

function demoIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** 规范化组件项目列表（非法条目直接丢弃，最多 20 个） */
export function sanitizeDemoProjects(input: unknown): DemoProject[] {
  if (!Array.isArray(input)) return [];
  const out: DemoProject[] = [];
  const seen = new Set<string>();
  for (const raw of input.slice(0, 20)) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const kind: DemoProject["kind"] = item.kind === "url" ? "url" : "repo";
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 60) : "";
    if (!name) continue;

    const desc = typeof item.desc === "string" ? item.desc.trim().slice(0, 200) : "";
    const repo = typeof item.repo === "string" ? item.repo.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";

    let id = typeof item.id === "string" ? item.id.trim().toLowerCase() : "";
    if (!DEMO_ID_RE.test(id)) id = demoIdFromName(name);
    if (!id && kind === "repo") id = demoIdFromName(repo.split("/").pop() ?? "");
    if (!id && kind === "url") id = demoIdFromName(url.replace(/^https?:\/\//i, "").split(/[/.]/)[0] ?? "");
    if (!id) id = `p-${out.length + 1}`;
    let unique = id;
    for (let n = 2; seen.has(unique); n += 1) unique = `${id}-${n}`;
    seen.add(unique);

    if (kind === "url") {
      if (!/^https?:\/\//i.test(url)) continue;
      out.push({ id: unique, name, kind, url, ...(desc ? { desc } : {}) });
    } else {
      if (!/^[\w.-]+(\/[\w.-]+)?$/.test(repo)) continue; // 允许只填仓库名
      const branch =
        typeof item.branch === "string" && item.branch.trim() ? item.branch.trim() : "main";
      const dir =
        typeof item.dir === "string" ? item.dir.trim().replace(/^\/+|\/+$/g, "") : "";
      if (dir.includes("..") || dir.startsWith(".")) continue;
      out.push({
        id: unique,
        name,
        kind,
        repo,
        branch,
        ...(dir ? { dir } : {}),
        ...(desc ? { desc } : {}),
      });
    }
  }
  return out;
}

/** 组件项目解析：环境变量 ATRIUM_DEMO_PROJECTS（JSON 数组）优先于 data/config.json */
export async function resolveDemoProjects(): Promise<DemoProject[]> {
  const env = process.env.ATRIUM_DEMO_PROJECTS;
  let projects: DemoProject[] = [];
  if (env) {
    try {
      projects = sanitizeDemoProjects(JSON.parse(env));
    } catch {
      // 坏环境变量：落回配置文件
      projects = [];
    }
  }
  if (projects.length === 0) {
    projects = sanitizeDemoProjects((await readStoredConfig()).demoProjects ?? []);
  }
  return withDefaultOwner(projects);
}

/** 仓库一栏允许只填仓库名：自动补上当前连接的 GitHub 账号（owner/名字 原样保留） */
async function withDefaultOwner(projects: DemoProject[]): Promise<DemoProject[]> {
  if (!projects.some((p) => p.kind === "repo" && p.repo && !p.repo.includes("/"))) return projects;
  const owner = (await resolveRepoConfig("github")).owner;
  if (!owner) return projects;
  return projects.map((p) =>
    p.kind === "repo" && p.repo && !p.repo.includes("/") ? { ...p, repo: `${owner}/${p.repo}` } : p,
  );
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
    demoProjects: sanitizeDemoProjects(cfg.demoProjects ?? []),
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
  // 画廊仓库与目录（独立图床）
  if (input.galleryRepo && typeof input.galleryRepo === "object") {
    const gr = input.galleryRepo as Record<string, unknown>;
    const gal = current.galleryRepo ?? { owner: "", repo: "", branch: "main" };
    next.galleryRepo = {
      owner: typeof gr.owner === "string" && gr.owner ? gr.owner : gal.owner,
      repo: typeof gr.repo === "string" && gr.repo ? gr.repo : gal.repo,
      branch: typeof gr.branch === "string" && gr.branch ? gr.branch : gal.branch || "main",
    };
  } else if (input.galleryRepo === "") {
    delete next.galleryRepo;
  }
  if (typeof input.galleryDir === "string") {
    next.galleryDir = input.galleryDir;
  }
  // 工坊组件项目（整组替换；空数组 = 清空）
  if ("demoProjects" in input) {
    const list = sanitizeDemoProjects(input.demoProjects);
    if (list.length > 0) next.demoProjects = list;
    else delete next.demoProjects;
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
