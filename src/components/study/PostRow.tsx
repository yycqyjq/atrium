import Link from "next/link";
import PostActions from "./PostActions";

export type PostRowData = {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  folder: string;
  tags: string[];
};

const postHref = (slug: string) => `/study/${slug.split("/").map(encodeURIComponent).join("/")}`;

/**
 * 文章行：书房列表与陈列廊共用。
 * - manageable：右侧日期位置在悬停 / 键盘聚焦时切换成「编辑 / 删除」（陈列廊不传，保持纯展示）
 * - 外层用 div 而非 a：a 里不能嵌交互元素（button），否则是无效 HTML
 * - 右侧容器用 div：承载的是一组操作（编辑 / 删除）及其弹窗、提示挂载点，按块级容器处理
 * - 日期用 opacity 让位而非 display：保留占位，行高与列宽不跳动
 */
export default function PostRow({
  post,
  showFolder = false,
  manageable = false,
}: {
  post: PostRowData;
  showFolder?: boolean;
  manageable?: boolean;
}) {
  return (
    <div className="group -mx-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 rounded-ctl border-b border-line px-3.5 py-4 transition-colors duration-150 last:border-0 hover:bg-wash [[data-density=compact]_&]:py-3 max-xs:grid-cols-1 max-xs:gap-y-1">
      <Link href={postHref(post.slug)} className="block min-w-0">
        <span className="block font-serif text-[16.5px] leading-normal tracking-[0.015em] text-ink transition-colors duration-150 group-hover:text-accent">
          {post.title}
        </span>
        {post.description ? (
          <span className="mt-1 block max-w-[52em] truncate text-[13px] leading-[1.65] text-ink-3">
            {post.description}
          </span>
        ) : null}
      </Link>

      <div className="relative shrink-0 text-right text-[12px] leading-[1.9] text-ink-3 tabular-nums">
        <span
          className={`block ${
            manageable
              ? "transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0"
              : ""
          }`}
        >
          {showFolder && post.folder ? (
            <span className="block tracking-[0.04em]">{post.folder}</span>
          ) : null}
          {post.dateLabel ? <span className="block">{post.dateLabel}</span> : null}
        </span>
        {manageable ? (
          <div className="absolute right-0 top-0 flex items-center gap-3 whitespace-nowrap leading-[1.9] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <PostActions slug={post.slug} title={post.title} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
