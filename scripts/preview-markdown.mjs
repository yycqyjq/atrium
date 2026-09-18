/**
 * 将 Markdown 按阅读页同款流水线渲染为独立 HTML 预览（用于样式核对与设计迭代）。
 *
 * 用法：
 *   node scripts/preview-markdown.mjs                           # 使用内置示例
 *   node scripts/preview-markdown.mjs <输入.md> <输出.html>      # 渲染指定文件
 *
 * 配套样式（生成到输出目录，HTML 通过 preview.css 引用真实主题）：
 *   npx @tailwindcss/cli@4.3.3 -i src/app/globals.css -o <输出目录>/preview.css
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

// 与 src/components/study/Markdown.tsx 一致的放行策略与管线顺序
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "width", "height", "align"],
    p: [...(defaultSchema.attributes?.p ?? []), "align"],
    div: [...(defaultSchema.attributes?.div ?? []), "align"],
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
  },
};

const fixture = `# 大标题

这是一段正文，包含 **加粗**、*斜体*、\`行内代码\` 与 [链接](https://example.com)。

## 二级小节

- 列表项一
- 列表项二，稍长一点，**带加粗** 与 \`inner code\`
- 列表项三

### 代码块

\`\`\`ts
// 注释：类型与关键字着色验证
interface PostMeta {
  title: string;
  tags: string[];
}

export async function listPosts(limit = 20) {
  const items = await fetchRepo("/contents");
  return items.slice(0, limit);
}
\`\`\`

\`\`\`bash
pnpm build && pnpm start
\`\`\`

### 表格与引用

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 首页 | 完成 | 问候 / 四扇门 / 最近在写 |
| 书房 | 完成 | 列表 + 阅读页 |

> 引用块：内容来自你自己的代码仓库，随时可换。

## 二级小节

重复标题用于验证锚点去重（应生成 -1 后缀）。

1. 有序列表
2. 第二项
3. 第三项
`;

function stripFrontMatter(raw) {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  return end === -1 ? raw : raw.slice(end + 4).replace(/^\r?\n/, "");
}

const inputPath = process.argv[2];
const outputPath = resolve(process.argv[3] ?? "preview.html");
const md = inputPath ? stripFrontMatter(readFileSync(resolve(inputPath), "utf8")) : fixture;

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, schema)
  .use(rehypeSlug)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeStringify)
  .process(md);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Markdown 预览（中庭样式）</title>
<link rel="stylesheet" href="preview.css">
<script>try{document.documentElement.dataset.theme=new URLSearchParams(location.search).get("theme")==="dark"?"dark":"light";}catch(e){}</script>
<style>body{padding:40px 48px;max-width:920px;margin:0 auto}</style>
</head>
<body>
<article class="md-body">${String(file)}</article>
</body>
</html>
`;

writeFileSync(outputPath, html);
console.log("预览已生成：", outputPath);
console.log("样式旁置：先生成 preview.css（见文件头部注释）");
