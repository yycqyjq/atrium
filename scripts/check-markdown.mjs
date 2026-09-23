/**
 * Markdown 流水线校验：模拟阅读页同款插件链
 * （remark-gfm → rehype-raw → rehype-sanitize → rehype-slug → rehype-highlight）
 * 验证：raw HTML 放行（图片/居中）、危险内容过滤、标题锚点、代码高亮。
 * 用法：node scripts/check-markdown.mjs
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";

// 与 src/components/study/Markdown.tsx 保持一致的放行策略
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

const md = `<p align="center">
  <a href="https://github.com/baomidou/mybatis-plus"><img alt="logo" src="https://raw.githubusercontent.com/baomidou/mybatis-plus/3.0/mybatis-plus-logo.png" width="360"></a>
</p>

## 简介

正文段落。

### 子节 \`code\`

内容。

## 简介

重复标题（用于验证去重锚点）。

\`\`\`js
// 假标题： ## 不应出现在目录里
const x = 1;
function hello() { return "hi"; }
\`\`\`

<script>alert(1)</script>
`;

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, schema)
  .use(rehypeSlug)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true });

const tree = await processor.run(processor.parse(md));

const elements = [];
(function walk(node) {
  if (node && typeof node === "object") {
    if (node.type === "element") elements.push(node);
    (node.children ?? []).forEach(walk);
  }
})(tree);

const headingIds = elements.filter((n) => /^h[1-6]$/.test(n.tagName)).map((n) => n.properties?.id);
const highlightSpans = elements.filter((n) => {
  const cls = n.properties?.className;
  return Array.isArray(cls) && cls.some((c) => String(c).startsWith("hljs-"));
});

console.log("标题锚点 ids:", headingIds.join(" | "));
console.log("高亮 span 数:", highlightSpans.length);
console.log(
  "高亮类别样例:",
  [...new Set(highlightSpans.flatMap((n) => n.properties.className).filter((c) => c !== "hljs"))]
    .slice(0, 6)
    .join(", "),
);

const expectIds = ["简介", "子节-code", "简介-1"];
const idsOk = JSON.stringify(headingIds) === JSON.stringify(expectIds);
const hljsOk = highlightSpans.length >= 3;
console.log(idsOk ? "✅ 锚点规则与预期一致" : `❌ 锚点不一致，预期 ${expectIds.join(" | ")}`);
console.log(hljsOk ? "✅ 代码高亮生效" : "❌ 代码高亮未生效");
process.exit(idsOk && hljsOk ? 0 : 1);
