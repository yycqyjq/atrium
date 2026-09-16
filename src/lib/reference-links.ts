/**
 * 参考资源：拆分正文尾部的「参考资源」段落（统一命名，向后兼容旧版多种写法）。
 *
 * 兼容的段落标记（独立成行，可带引用前缀 >）：
 *   **参考资源**：   *参考资源：*   **参考链接**：   ## 参考资源
 *
 * 兼容的条目写法：
 *   - https://example.com
 *   - <https://example.com>
 *   - [标题](https://example.com)
 *   - 名称：[https://example.com](https://example.com)
 *   - 名称：https://example.com
 *
 * 写入格式（写作台统一生成）：
 *
 * ```
 * 正文……
 *
 * ---
 *
 * **参考资源**：
 * - https://example.com
 * - [标题](https://example.com)
 * ```
 */
export type ReferenceLink = { label: string; url: string };

const NAME_RE = /^(?:\s*>\s*)*[*_]{0,3}(参考资源|参考链接)[*_]{0,3}\s*[：:]?\s*$/;
const HEAD_RE = /^(?:\s*>\s*)*#{2,4}\s*(参考资源|参考链接)\s*$/;

export function splitReferenceLinks(raw: string): { body: string; links: ReferenceLink[] } {
  const md = raw.replace(/\r\n/g, "\n");
  const lines = md.split("\n");

  // 找最后一个段落标记行
  let markerLine = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    if (NAME_RE.test(line) || HEAD_RE.test(line)) markerLine = i;
  }
  if (markerLine === -1) return { body: raw, links: [] };

  // 逐行解析条目（去掉引用前缀）
  const links: ReferenceLink[] = [];
  for (let i = markerLine + 1; i < lines.length; i += 1) {
    let line = lines[i];
    while (/^\s*>\s?/.test(line)) line = line.replace(/^\s*>\s?/, "");
    line = line.trim();
    if (!line) continue;
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    if (!bullet) continue;
    const parsed = parseItem(bullet[1].trim());
    if (parsed) links.push(parsed);
  }
  // 没有解析出任何链接则不视为参考段（避免误伤正文里出现的同名词）
  if (links.length === 0) return { body: raw, links: [] };

  // 正文：剥离标记段及其前的分隔线/引用残留
  let body = lines
    .slice(0, markerLine)
    .join("\n")
    .replace(/(?:\n\s*>\s*)+$/, "")
    .replace(/(?:\n+(?:-{3,}|\*{3,})\s*)+$/, "")
    .replace(/\s+$/, "");
  if (!body) body = "";
  return { body, links };
}

function parseItem(item: string): ReferenceLink | null {
  // 名称：[URL](URL) 或 [标题](url)
  const withLink = item.match(/^(.*?)\[([^\]]*)\]\((<?[^)\s]+>?)\)\s*$/);
  if (withLink) {
    const prefix = withLink[1].replace(/[：:\s]+$/, "").trim();
    const text = withLink[2].trim();
    const url = withLink[3].replace(/^<|>$/g, "");
    return { label: prefix || text || url, url };
  }
  // 名称：URL
  const named = item.match(/^(.+?)[：:]\s*(<?https?:\/\/\S+?>?)\s*$/);
  if (named) return { label: named[1].trim(), url: named[2].replace(/^<|>$/g, "") };
  // 裸链接
  const bare = item.replace(/^<|>$/g, "").trim();
  if (/^https?:\/\/\S+$/.test(bare)) return { label: bare, url: bare };
  return null;
}
