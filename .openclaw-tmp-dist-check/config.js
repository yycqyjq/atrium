"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStoredConfig = readStoredConfig;
exports.resolveRepoConfig = resolveRepoConfig;
exports.defaultProviderKey = defaultProviderKey;
exports.galleryDir = galleryDir;
exports.publicConfig = publicConfig;
exports.readPublicConfig = readPublicConfig;
exports.updateConfig = updateConfig;
exports.githubProfileUrl = githubProfileUrl;
exports.resolveGalleryConfig = resolveGalleryConfig;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const types_1 = require("./providers/types");
const DATA_DIR = process.env.ATRIUM_DATA_DIR || node_path_1.default.join(process.cwd(), "data");
const CONFIG_PATH = node_path_1.default.join(DATA_DIR, "config.json");
/** 轻量读取缓存：写配置时立即失效 */
const CACHE_TTL = 2000;
let cache = null;
async function readStoredConfig() {
    if (cache && Date.now() - cache.at < CACHE_TTL)
        return cache.value;
    let value = {};
    try {
        value = JSON.parse(await node_fs_1.promises.readFile(CONFIG_PATH, "utf8"));
    }
    catch {
        value = {};
    }
    cache = { at: Date.now(), value };
    return value;
}
/** 每家内容源对应的环境变量名（优先级：环境变量 > data/config.json） */
const ENV_FIELDS = {
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
async function resolveRepoConfig(key) {
    const stored = (await readStoredConfig()).repos?.[key] ?? {};
    const envNames = ENV_FIELDS[key];
    const pick = (envName, storedValue) => (process.env[envName] ?? storedValue ?? "").trim();
    return {
        owner: pick(envNames.owner, stored.owner),
        repo: pick(envNames.repo, stored.repo),
        branch: pick(envNames.branch, stored.branch) || "main",
        token: pick(envNames.token, stored.token),
    };
}
async function defaultProviderKey() {
    const fromEnv = process.env.ATRIUM_DEFAULT_PROVIDER;
    if ((0, types_1.isProviderKey)(fromEnv))
        return fromEnv;
    return (await readStoredConfig()).defaultProvider ?? "github";
}
/** 画廊根目录：环境变量 > config.json > 缺省 images/；空字符串表示仓库根 */
async function galleryDir() {
    const fromEnv = process.env.ATRIUM_GALLERY_DIR;
    if (fromEnv != null)
        return fromEnv.replace(/^\/+|\/+$/g, "");
    const stored = (await readStoredConfig()).galleryDir;
    if (stored != null)
        return stored.replace(/^\/+|\/+$/g, "");
    return "images";
}
/** 面向客户端的安全视图：绝不返回 token 原文 */
function publicConfig(cfg) {
    const repos = {};
    for (const key of types_1.PROVIDER_KEYS) {
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
async function readPublicConfig() {
    return publicConfig(await readStoredConfig());
}
const WRITABLE_SCALARS = [
    "siteName",
    "siteTitle",
    "siteSubtitle",
    "footerText",
    "aboutBio",
];
/** 合并式写入（不做整体覆盖，避免意外丢字段） */
async function updateConfig(input) {
    const current = await readStoredConfig();
    const next = { ...current };
    for (const key of WRITABLE_SCALARS) {
        if (key in input && typeof input[key] === "string")
            next[key] = input[key];
    }
    if (Array.isArray(input.skills)) {
        next.skills = input.skills.filter((s) => typeof s === "string");
    }
    const wanted = input.defaultProvider;
    if (typeof wanted === "string" && types_1.PROVIDER_KEYS.includes(wanted)) {
        next.defaultProvider = wanted;
    }
    if (input.repos && typeof input.repos === "object") {
        const repos = { ...(current.repos ?? {}) };
        for (const [key, value] of Object.entries(input.repos)) {
            if (!types_1.PROVIDER_KEYS.includes(key))
                continue;
            if (typeof value !== "object" || value === null)
                continue;
            const source = value;
            const merged = { ...repos[key] };
            for (const field of ["owner", "repo", "branch", "token"]) {
                if (typeof source[field] === "string")
                    merged[field] = source[field];
            }
            repos[key] = merged;
        }
        next.repos = repos;
    }
    await node_fs_1.promises.mkdir(DATA_DIR, { recursive: true });
    await node_fs_1.promises.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    cache = null;
    return publicConfig(next);
}
/** 首页常用入口：GitHub 账号主页 */
async function githubProfileUrl() {
    const cfg = await resolveRepoConfig("github");
    return cfg.owner ? `https://github.com/${cfg.owner}` : "https://github.com";
}
/**
 * 画廊仓库：优先 GITHUB_GALLERY_* / GITEE_GALLERY_*（按默认内容源选择前缀），
 * 其次 config.json 的 galleryRepo，未设置时落到默认内容源的主仓库。
 */
async function resolveGalleryConfig() {
    const provider = await defaultProviderKey();
    const base = await resolveRepoConfig(provider);
    const stored = await readStoredConfig();
    const gallery = stored.galleryRepo ?? {};
    const prefix = provider === "gitee" ? "GITEE_GALLERY" : "GITHUB_GALLERY";
    const pick = (envName, storedValue, fallback) => (process.env[envName] ?? storedValue ?? fallback ?? "").trim();
    return {
        provider,
        owner: pick(`${prefix}_OWNER`, gallery.owner, base.owner),
        repo: pick(`${prefix}_REPO`, gallery.repo, base.repo),
        branch: pick(`${prefix}_BRANCH`, gallery.branch, base.branch) || "main",
        token: pick(`${prefix}_TOKEN`, gallery.token, base.token),
    };
}
