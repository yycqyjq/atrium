import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";

/**
 * 管线顺序：raw（解析原始 HTML）→ sanitize（过滤危险内容）→ slug（标题锚点）→ highlight（代码高亮）。
 * 放行策略在默认安全策略（GitHub 同款）上扩展：图片布局等常用属性；脚本 / 事件属性 / 危险协议仍被过滤。
 */
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

const components: Components = {
  a({ node, href, children, ...rest }) {
    void node;
    const external = typeof href === "string" && /^https?:/i.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  },
};

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [rehypeSanitize, schema],
        rehypeSlug,
        [rehypeHighlight, { detect: false, ignoreMissing: true }],
      ]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
}
