import Link from "next/link";

export type PostRowData = {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  folder: string;
  tags: string[];
};

const postHref = (slug: string) => `/study/${slug.split("/").map(encodeURIComponent).join("/")}`;

/** 文章行：书房列表与陈列廊共用。 */
export default function PostRow({
  post,
  showFolder = false,
}: {
  post: PostRowData;
  showFolder?: boolean;
}) {
  return (
    <Link
      href={postHref(post.slug)}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 border-b border-line py-4 pr-1 transition-colors duration-150 last:border-0 hover:bg-wash max-xs:grid-cols-1 max-xs:gap-y-1"
    >
      <span className="block min-w-0">
        <span className="block font-serif text-[16.5px] leading-normal tracking-[0.015em] text-ink transition-colors duration-150 group-hover:text-accent">
          {post.title}
        </span>
        {post.description ? (
          <span className="mt-1 block max-w-[52em] truncate text-[13px] leading-[1.65] text-ink-3">
            {post.description}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-[12px] leading-[1.9] text-ink-3 tabular-nums">
        {showFolder && post.folder ? <span className="block tracking-[0.04em]">{post.folder}</span> : null}
        {post.dateLabel ? <span className="block">{post.dateLabel}</span> : null}
      </span>
    </Link>
  );
}
