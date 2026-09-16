/**
 * 参考链接：拆分正文尾部的「**参考链接**」段落（与旧版 ark-admin 格式兼容）。
 *
 * 约定格式（写作台自动生成）：
 *
 * ```
 * 正文……
 *
 * ---
 *
 * **参考链接**：
 * - https://example.com
 * - [标题](https://example.com)
 * ```
 */
export type ReferenceLink = { label: string; url: string };

const MARKER = "\n\n---\n\n**参考链接**";

export function splitReferenceLinks(raw: string): { body: string; links: ReferenceLink[] } {
  const md = raw.replace(/\r\n/g, "\n");
  const idx = md.lastIndexOf(MARKER);
  if (idx === -1) return { body: raw, links: [] };

  const body = md.slice(0, idx).replace(/\s+$/, "");
  const tail = md.slice(idx);
  const section = tail.match(/\*\*参考链接\*\*[：:]?\s*\n([\s\S]*)/);
  if (!section) return { body: raw, links: [] };

  const links: ReferenceLink[] = [];
  for (const line of section[1].split("\n")) {
    const m = line.match(/^\s*[-*]\s*(.+?)\s*$/);
    if (!m) continue;
    const item = m[1].trim();
    if (!item) continue;

    // [标题](url) 形式
    const mdLink = item.match(/^\[([^\]]*)\]\((<?[^)\s]+>?)\)$/);
    if (mdLink) {
      links.push({ label: mdLink[1].trim() || mdLink[2], url: mdLink[2].replace(/^<|>$/g, "") });
      continue;
    }
    // 裸链接（可带 <> 包裹）
    const url = item.replace(/^<|>$/g, "");
    links.push({ label: url, url });
  }

  return { body, links };
}
