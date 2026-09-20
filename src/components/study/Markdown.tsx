import ReactMarkdown, { type Components } from "react-markdown";
import { isValidElement } from "react";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import MermaidBlock from "./MermaidBlock";

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

const isMermaid = (child: unknown) =>
  isValidElement(child) &&
  typeof (child as { props?: { className?: string } }).props?.className === "string" &&
  (child as { props: { className: string } }).props.className.includes("language-mermaid");

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
  pre({ node, children, ...rest }) {
    void node;
    const first = Array.isArray(children) ? children[0] : children;
    // mermaid 块拆掉 pre 外壳（svg 不该嵌在 pre 里），其余代码块原样
    if (isMermaid(first)) return <>{first}</>;
    return <pre {...rest}>{children}</pre>;
  },
  code({ node, className, children, ...rest }) {
    void node;
    if (typeof className === "string" && className.includes("language-mermaid")) {
      return <MermaidBlock source={String(children).replace(/\n$/, "")} />;
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
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
