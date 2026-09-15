/**
 * Markdown 流水线校验：模拟阅读页同款插件链（remark-gfm → rehype-raw → rehype-sanitize），
 * 验证「raw HTML 放行（图片/居中）且危险内容被过滤」。
 * 用法：node scripts/check-markdown.mjs
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

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

一段中文正文。

<script>alert(1)</script>

<img src="javascript:alert(2)" alt="bad">

- [x] 任务列表
`;

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, schema);

const tree = await processor.run(processor.parse(md));

const elements = [];
(function walk(node) {
  if (node && typeof node === "object") {
    if (node.type === "element") elements.push(node);
    (node.children ?? []).forEach(walk);
  }
})(tree);

const imgs = elements.filter((n) => n.tagName === "img");
const scripts = elements.filter((n) => n.tagName === "script");
const centered = elements.find((n) => n.tagName === "p" && n.properties?.align === "center");
const okImg = imgs.find((n) => typeof n.properties?.src === "string" && n.properties.src.startsWith("https://"));
const badImg = imgs.find((n) => String(n.properties?.src ?? "").startsWith("javascript:"));

console.log("img 总数:", imgs.length, "| 有效 https 图片:", okImg ? "✓" : "✗");
console.log("script 残留:", scripts.length);
console.log("p[align=center] 保留:", centered ? "✓" : "✗");
console.log("javascript: 协议图片被过滤:", badImg ? "✗ 未过滤" : "✓");

const pass = imgs.length >= 1 && okImg && scripts.length === 0 && centered && !badImg;
console.log(pass ? "✅ Markdown 流水线校验通过" : "❌ Markdown 流水线校验失败");
process.exit(pass ? 0 : 1);
