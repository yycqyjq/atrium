import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

const DEFAULT_FILE = "admin/tools.json";

function isLocalPath(p: string) {
  return p.startsWith("/") || p.startsWith("./") || p.startsWith("../");
}

type ToolsData = { categories: string[]; items: Array<Record<string, unknown>> };

function parseTools(raw: string): ToolsData | null {
  try {
    const data = JSON.parse(raw) as ToolsData;
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    if (!Array.isArray(data.categories)) data.categories = [];
    return data;
  } catch {
    return null;
  }
}

/**
 * 添加书签：POST { name, url, description?, category? }
 * 写入内容仓库的 admin/tools.json（与旧版 ark-admin 同格式）；
 * ATRIUM_TOOLS_FILE 为本地文件时直接写本地。仅限本地服务使用。
 */
export async function POST(request: Request) {
  let payload: { name?: unknown; url?: unknown; description?: unknown; category?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "未分类";

  if (!name) return NextResponse.json({ error: "缺少名称" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "URL 需以 http(s):// 开头" }, { status: 400 });

  const file = (process.env.ATRIUM_TOOLS_FILE ?? DEFAULT_FILE).trim() || DEFAULT_FILE;
  const local = isLocalPath(file);

  try {
    let data: ToolsData = { categories: [], items: [] };
    let sha: string | undefined;

    if (local) {
      try {
        const raw = await fs.readFile(path.resolve(file), "utf8");
        data = parseTools(raw) ?? data;
      } catch {
        data = { categories: [], items: [] };
      }
    } else {
      const provider = await getProvider();
      if (!(await provider.isConfigured())) {
        return NextResponse.json({ error: "内容源未配置" }, { status: 400 });
      }
      try {
        const f = await provider.getFile(file);
        sha = f.sha || undefined;
        data = parseTools(Buffer.from(f.content, "base64").toString("utf8")) ?? data;
      } catch {
        data = { categories: [], items: [] }; // 文件不存在 → 首次创建
      }
    }

    // 去重：同名且同 URL 已存在则拒绝
    const exists = data.items.some(
      (t) => String(t.name ?? "") === name && String(t.url ?? "") === url,
    );
    if (exists) return NextResponse.json({ error: "同名同地址的工具已存在" }, { status: 409 });

    if (!data.categories.includes(category)) data.categories.push(category);
    data.items.push({ name, url, description, category });

    const content = `${JSON.stringify(data, null, 2)}\n`;

    if (local) {
      await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
      await fs.writeFile(path.resolve(file), content, "utf8");
    } else {
      const provider = await getProvider();
      await provider.putFile(
        file,
        Buffer.from(content, "utf8").toString("base64"),
        `feat(tools): 添加「${name}」`,
        sha,
      );
    }

    return NextResponse.json({ ok: true, total: data.items.length, requestId: randomUUID() });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有写入权限（需要 repo 权限）" }, { status: 502 });
    }
    console.warn("[tools] 添加失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "添加失败，请稍后再试" }, { status: 500 });
  }
}
