/**
 * 正文里的图片引用解析：供「转存外链图片」使用。
 *
 * 返回的是**原文字节偏移**（start/end 指向 URL 文本本身），
 * 调用方据此在原文里做定点替换——比「字符串全局替换」安全：
 * 同一个 URL 出现在多个位置时逐个命中，且不会误伤正文里同名的普通文本。
 */

export type ImageRef = {
  /** 图片地址原文（可能带 <...> 包裹，去壳后的值） */
  url: string;
  /** URL 文本在正文里的起止偏移（不含 Markdown 的 ![]() 外壳） */
  start: number;
  end: number;
};

/** Markdown 图片：![alt](url)、![alt](url "title")、![alt](<url>) */
const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;

/** 裸 HTML 图片：<img src="..."> / <img src='...'>（rehypeRaw 会放行，所以也要认） */
const HTML_IMAGE_RE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * 正文里「非代码」的区段。
 * 围栏代码块（``` / ~~~）内的内容是示例，不该被当成真实图片去转存。
 */
function proseSpans(body: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let offset = 0;
  let contentStart = 0;
  let inFence = false;

  for (const line of body.split("\n")) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      if (inFence) {
        // 闭围栏：代码块到此为止，正文从下一行重新开始
        inFence = false;
        contentStart = offset + line.length + 1;
      } else {
        // 开围栏：先把围栏之前的正文收下，之后到闭围栏为止都不算正文
        if (offset > contentStart) spans.push([contentStart, offset]);
        inFence = true;
      }
    }
    offset += line.length + 1;
  }

  // 围栏没闭合：尾部整段当代码处理，不再纳入
  if (!inFence && contentStart < body.length) spans.push([contentStart, body.length]);
  return spans;
}

/** 去掉 Markdown 的尖括号包裹（<url> 用于地址里含空格等场景） */
function unwrap(raw: string): string {
  return raw.startsWith("<") && raw.endsWith(">") ? raw.slice(1, -1) : raw;
}

/** 收集正文里的全部图片引用，按出现顺序返回 */
export function collectImageRefs(body: string): ImageRef[] {
  const refs: ImageRef[] = [];

  for (const [from, to] of proseSpans(body)) {
    const text = body.slice(from, to);

    for (const m of text.matchAll(MD_IMAGE_RE)) {
      const raw = m[1];
      // 从 "]( 之后开始找，避开 alt 文本里恰好与 URL 同名的干扰
      const afterParen = m[0].indexOf("](") + 2;
      const inner = m[0].indexOf(raw, afterParen);
      if (inner < 0) continue;
      const url = unwrap(raw);
      if (!url) continue;
      // 只让开头的 < 一位（结尾的 > 不影响起始位置）
      const lead = raw.length - url.length > 0 ? 1 : 0;
      const urlStart = from + m.index + inner + lead;
      refs.push({ url, start: urlStart, end: urlStart + url.length });
    }

    for (const m of text.matchAll(HTML_IMAGE_RE)) {
      const raw = m[1] ?? m[2] ?? "";
      if (!raw) continue;
      const inner = m[0].indexOf(raw, m[0].indexOf("src") + 3);
      if (inner < 0) continue;
      refs.push({
        url: raw,
        start: from + m.index + inner,
        end: from + m.index + inner + raw.length,
      });
    }
  }

  return refs.sort((a, b) => a.start - b.start);
}

/**
 * 按偏移把正文里的图片地址换成新地址。
 * @param mapping 原地址 → 新地址；没命中的位置保持原样
 * 从后往前替换，前面的偏移不会被后面的长度变化影响。
 */
export function replaceImageUrls(body: string, mapping: Map<string, string>): string {
  if (mapping.size === 0) return body;
  const refs = collectImageRefs(body).filter((ref) => mapping.has(ref.url));
  let next = body;
  for (const ref of refs.reverse()) {
    next = next.slice(0, ref.start) + mapping.get(ref.url) + next.slice(ref.end);
  }
  return next;
}
