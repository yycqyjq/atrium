import { readFile } from "node:fs/promises";
import { cacheThrough, invalidateCache } from "@/lib/cache";
import path from "node:path";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import type { ContentReason } from "@/lib/content";

export type ToolItem = {
  name: string;
  url: string;
  description: string;
  category: string;
};

export type ToolGroup = { name: string; items: ToolItem[] };

/** 与旧版 ark-admin 完全兼容：仓库 admin/tools.json，{ categories, items } */
const DEFAULT_FILE = "admin/tools.json";

function isLocalPath(p: string) {
  return p.startsWith("/") || p.startsWith("./") || p.startsWith("../");
}

function parseTools(raw: string): { categories: string[]; items: ToolItem[] } | null {
  try {
    const data = JSON.parse(raw) as {
      categories?: unknown;
      items?: unknown;
    };
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    const categories = Array.isArray(data.categories)
      ? data.categories.filter((c): c is string => typeof c === "string")
      : [];
    const items = data.items
      .filter(
        (t): t is Record<string, unknown> =>
          Boolean(t) && typeof t === "object" && typeof (t as Record<string, unknown>).name === "string" && typeof (t as Record<string, unknown>).url === "string",
      )
      .map((t) => ({
        name: String(t.name).trim(),
        url: String(t.url).trim(),
        description: typeof t.description === "string" ? t.description : "",
        category: typeof t.category === "string" ? t.category : "",
      }))
      .filter((t) => t.name && t.url);
    return { categories, items };
  } catch {
    return null;
  }
}

/**
 * 工具房：读取工具清单（默认仓库 admin/tools.json，兼容旧版 ark-admin 格式）。
 * ATRIUM_TOOLS_FILE 可指定其他仓库路径；以 / 或 ./ 开头时读取本地文件。
 */
export type ToolsResult = {
  groups: ToolGroup[];
  count: number;
  reason: ContentReason;
  source: "repo" | "local";
};

const TOOLS_TTL = 5 * 60_000;

/** 写操作（增删改书签）后调用，让工具房即刻反映最新内容 */
export function bustToolsCache() {
  void invalidateCache("tools");
}

/** 带两级缓存的工具清单（失败回退旧数据） */
export async function listTools(): Promise<ToolsResult> {
  const { value } = await cacheThrough("tools", TOOLS_TTL, computeTools, {
    shouldCache: (v) => v.reason === "ok",
  });
  return value;
}

async function computeTools(): Promise<ToolsResult> {
  const file = (process.env.ATRIUM_TOOLS_FILE ?? DEFAULT_FILE).trim() || DEFAULT_FILE;
  const source: "repo" | "local" = isLocalPath(file) ? "local" : "repo";

  let raw: string | null = null;
  try {
    if (source === "local") {
      try {
        raw = await readFile(path.resolve(file), "utf8");
      } catch {
        raw = null;
      }
    } else {
      const provider = await getProvider();
      if (!(await provider.isConfigured())) {
        return { groups: [], count: 0, reason: "not-configured", source };
      }
      const f = await provider.getFile(file);
      // contents API 返回 base64，需要解码；本地文件分支已是文本
      raw = Buffer.from(f.content, "base64").toString("utf8");
    }
  } catch (err) {
    if (err instanceof ProviderError && err.status === 404) {
      raw = null; // 还没放清单 → 空态
    } else {
      console.warn("[tools] 获取失败：", err);
      return { groups: [], count: 0, reason: "fetch-failed", source };
    }
  }

  if (raw == null) return { groups: [], count: 0, reason: "ok", source };

  const parsed = parseTools(raw);
  if (!parsed) {
    console.warn("[tools] 清单格式不正确");
    return { groups: [], count: 0, reason: "fetch-failed", source };
  }

  const byCategory = new Map<string, ToolItem[]>();
  for (const item of parsed.items) {
    const key = item.category || "未分类";
    const list = byCategory.get(key) ?? [];
    list.push(item);
    byCategory.set(key, list);
  }

  const ordered = [
    ...parsed.categories.filter((c) => byCategory.has(c)),
    ...Array.from(byCategory.keys()).filter((c) => !parsed.categories.includes(c)),
  ];
  const groups = ordered.map((name) => ({ name, items: byCategory.get(name) ?? [] }));

  return { groups, count: parsed.items.length, reason: "ok", source };
}
