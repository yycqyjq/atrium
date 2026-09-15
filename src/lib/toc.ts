import GithubSlugger from "github-slugger";

export type TocItem = { depth: number; text: string; id: string };

/** 从 Markdown 正文提取目录（h1-h3，跳过代码块）；id 与 rehype-slug 规则一致 */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    const text = line.trim();
    if (text.startsWith("```") || text.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = text.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const depth = match[1].length;
    const clean = match[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_~]/g, "")
      .trim();
    if (!clean) continue;
    items.push({ depth, text: clean, id: slugger.slug(clean) });
  }
  return items;
}
