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

/** 读取清单内容与 sha（仓库或本地文件），不存在时返回空数据 */
async function loadToolsData(): Promise<{ data: ToolsData; sha?: string }> {
  const file = (process.env.ATRIUM_TOOLS_FILE ?? DEFAULT_FILE).trim() || DEFAULT_FILE;
  if (isLocalPath(file)) {
    try {
      const raw = await fs.readFile(path.resolve(file), "utf8");
      return { data: parseTools(raw) ?? { categories: [], items: [] } };
    } catch {
      return { data: { categories: [], items: [] } };
    }
  }
  const provider = await getProvider();
  if (!(await provider.isConfigured())) throw new Error("not-configured");
  try {
    const f = await provider.getFile(file);
    return { data: parseTools(Buffer.from(f.content, "base64").toString("utf8")) ?? { categories: [], items: [] }, sha: f.sha || undefined };
  } catch {
    return { data: { categories: [], items: [] } }; // 文件不存在 → 首次创建
  }
}

async function saveToolsData(data: ToolsData, sha?: string, message = "chore(tools): 更新清单"): Promise<void> {
  const file = (process.env.ATRIUM_TOOLS_FILE ?? DEFAULT_FILE).trim() || DEFAULT_FILE;
  const content = `${JSON.stringify(data, null, 2)}\n`;
  if (isLocalPath(file)) {
    await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await fs.writeFile(path.resolve(file), content, "utf8");
    return;
  }
  const provider = await getProvider();
  await provider.putFile(file, Buffer.from(content, "utf8").toString("base64"), message, sha);
}

/** 添加书签：POST { name, url, description?, category? } */
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
  const category = typeof payload.category === "string" && payload.category.trim() ? payload.category.trim() : "未分类";

  if (!name) return NextResponse.json({ error: "缺少名称" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "URL 需以 http(s):// 开头" }, { status: 400 });

  try {
    const { data, sha } = await loadToolsData();
    const exists = data.items.some((t) => String(t.name ?? "") === name && String(t.url ?? "") === url);
    if (exists) return NextResponse.json({ error: "同名同地址的工具已存在" }, { status: 409 });

    if (!data.categories.includes(category)) data.categories.push(category);
    data.items.push({ name, url, description, category });

    await saveToolsData(data, sha, `feat(tools): 添加「${name}」`);
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

/** 删除书签：DELETE ?name=<名称>&url=<完整地址>；同名不同址互不影响 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") ?? "").trim();
  const url = (searchParams.get("url") ?? "").trim();

  if (!name || !url) {
    return NextResponse.json({ error: "缺少 name 或 url 参数" }, { status: 400 });
  }

  try {
    const { data, sha } = await loadToolsData();
    const before = data.items.length;
    data.items = data.items.filter((t) => !(String(t.name ?? "") === name && String(t.url ?? "") === url));
    if (data.items.length === before) {
      return NextResponse.json({ error: "未找到匹配的书签" }, { status: 404 });
    }

    // 清理不再使用的空分类
    const used = new Set(data.items.map((t) => String(t.category ?? "未分类")));
    data.categories = data.categories.filter((c) => used.has(c));

    await saveToolsData(data, sha, `chore(tools): 移除「${name}」`);
    return NextResponse.json({ ok: true, total: data.items.length });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有写入权限（需要 repo 权限）" }, { status: 502 });
    }
    console.warn("[tools] 删除失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 编辑：PATCH { kind: "tool", oldName, oldUrl, name?, url?, description?, category? }
 *        或 { kind: "category", oldName, name }
 */
export async function PATCH(request: Request) {
  let payload: {
    kind?: unknown;
    oldName?: unknown;
    oldUrl?: unknown;
    name?: unknown;
    url?: unknown;
    description?: unknown;
    category?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const kind = payload.kind === "category" ? "category" : "tool";

  try {
    const { data, sha } = await loadToolsData();

    if (kind === "tool") {
      const oldName = typeof payload.oldName === "string" ? payload.oldName.trim() : "";
      const oldUrl = typeof payload.oldUrl === "string" ? payload.oldUrl.trim() : "";
      const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : oldName;
      const url = typeof payload.url === "string" && payload.url.trim() ? payload.url.trim() : oldUrl;
      const description = typeof payload.description === "string" ? payload.description.trim() : "";
      const category = typeof payload.category === "string" && payload.category.trim() ? payload.category.trim() : "未分类";

      if (!oldName || !oldUrl) return NextResponse.json({ error: "缺少定位信息" }, { status: 400 });
      if (!name) return NextResponse.json({ error: "缺少名称" }, { status: 400 });
      if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "URL 需以 http(s):// 开头" }, { status: 400 });

      const idx = data.items.findIndex((t) => String(t.name ?? "") === oldName && String(t.url ?? "") === oldUrl);
      if (idx === -1) return NextResponse.json({ error: "未找到匹配的书签" }, { status: 404 });

      const dup = data.items.some(
        (t, i) => i !== idx && String(t.name ?? "") === name && String(t.url ?? "") === url,
      );
      if (dup) return NextResponse.json({ error: "同名同地址的工具已存在" }, { status: 409 });

      const oldCategory = String(data.items[idx].category ?? "未分类");
      data.items[idx] = { name, url, description, category };
      if (!data.categories.includes(category)) data.categories.push(category);
      const stillUsed = data.items.some((t) => String(t.category ?? "未分类") === oldCategory);
      if (!stillUsed) data.categories = data.categories.filter((c) => c !== oldCategory);

      await saveToolsData(data, sha, `feat(tools): 更新「${oldName}」`);
      return NextResponse.json({ ok: true, total: data.items.length });
    }

    const oldName = typeof payload.oldName === "string" ? payload.oldName.trim() : "";
    const newName = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!oldName || !newName) return NextResponse.json({ error: "缺少分类名" }, { status: 400 });
    if (!data.categories.includes(oldName)) return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    if (data.categories.includes(newName)) return NextResponse.json({ error: "新分类名已存在" }, { status: 409 });

    data.categories = data.categories.map((c) => (c === oldName ? newName : c));
    for (const item of data.items) {
      if (String(item.category ?? "") === oldName) item.category = newName;
    }

    await saveToolsData(data, sha, `feat(tools): 分类「${oldName}」重命名为「${newName}」`);
    return NextResponse.json({ ok: true, categories: data.categories.length });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "令牌没有写入权限（需要 repo 权限）" }, { status: 502 });
    }
    console.warn("[tools] 编辑失败：", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "保存失败，请稍后再试" }, { status: 500 });
  }
}
