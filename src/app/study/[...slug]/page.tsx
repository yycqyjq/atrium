import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/shell/Footer";
import Markdown from "@/components/study/Markdown";
import Toc from "@/components/study/Toc";
import StudyBrowser, { type BrowserSection } from "@/components/study/StudyBrowser";
import FloorNav from "@/components/shell/FloorNav";
import { IconArrowRight } from "@/components/icons";
import { getPostBySlug, getStudyDir, type PostMeta } from "@/lib/content";
import { extractToc } from "@/lib/toc";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string[] }> };

const parentDir = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

function toBrowserPost(post: PostMeta) {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    dateLabel: post.dateLabel,
    folder: parentDir(post.path),
    tags: post.tags,
  };
}

function decodeParts(slugParts: string[]): string[] {
  return slugParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
}

function fullDate(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    if (post) return { title: post.meta.title };
    const dir = await getStudyDir(slug);
    if (dir) {
      const name = decodeParts(slug).join(" / ");
      return { title: name || "书房" };
    }
    return { title: "未找到" };
  } catch {
    return { title: "书房" };
  }
}

function PostError() {
  return (
    <>
      <div className="mb-[72px] flex grow flex-col">
        <div className="mx-auto my-auto flex max-w-[480px] flex-col items-center text-center">
          <p className="mb-3 font-serif text-[23px] font-semibold tracking-[0.03em]">
            这页暂时打不开。
          </p>
          <p className="mb-7 max-w-[26em] text-sm text-ink-2">
            内容源连不上（可能是网络或访问限额），稍后再试；也可以先回书房看看别的。
          </p>
          <Link
            href="/study"
            className="inline-flex items-center gap-2 rounded-ctl border border-line-strong px-[18px] py-[9px] text-[13px] text-ink-2 transition-colors duration-150 hover:border-ink-3 hover:bg-wash hover:text-ink"
          >
            <IconArrowRight className="h-3.5 w-3.5 -scale-x-100" />
            回到书房
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

/** 面包屑：中庭 / 书房 / 段1 / 段2 …（各段可点击，最后一段为当前位置） */
function Breadcrumb({ segments }: { segments: string[] }) {
  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-1 text-[12.5px] tracking-[0.1em] text-ink-3">
      <Link href="/" className="transition-colors duration-150 hover:text-accent">
        中庭
      </Link>
      <span> / </span>
      <Link href="/study" className="transition-colors duration-150 hover:text-accent">
        书房
      </Link>
      {segments.map((segment, i) => {
        const href = `/study/${segments
          .slice(0, i + 1)
          .map(encodeURIComponent)
          .join("/")}`;
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="inline-flex items-center gap-x-1">
            <span> / </span>
            {isLast ? (
              <span className="text-ink-2">{segment}</span>
            ) : (
              <Link href={href} className="transition-colors duration-150 hover:text-accent">
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </p>
  );
}

export default async function StudySlugPage({ params }: Props) {
  const { slug } = await params;

  // 1) 先按文章解析
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    return <PostError />;
  }

  if (post) {
    const { meta, body } = post;
    const toc = extractToc(body);
    const folderSegments = meta.slug.split("/").slice(0, -1);

    return (
      <>
        <div className="mb-[72px]">
          <header className="pt-4 pb-9">
            <Breadcrumb segments={folderSegments} />
            <h1 className="mb-4 max-w-[26em] font-serif text-[clamp(28px,3.6vw,38px)] font-semibold leading-[1.22] tracking-[0.02em]">
              {meta.title}
            </h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
              {meta.lastModified ? (
                <span className="tabular-nums">{fullDate(meta.lastModified)}</span>
              ) : null}
              {meta.tags.length > 0 ? (
                <span className="tracking-[0.03em]">
                  {meta.tags.map((tag) => `#${tag}`).join("  ")}
                </span>
              ) : null}
              <Link
                href={`/study/write?edit=${encodeURIComponent(meta.slug)}`}
                className="group ml-auto inline-flex items-center gap-1.5 text-accent transition-colors duration-150 hover:text-accent-hover"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="size-[13px]"
                >
                  <path d="M4 20 H8 L19 9 C19.8 8.2 19.8 7 19 6.2 L17.8 5 C17 4.2 15.8 4.2 15 5 L4 16 Z" />
                </svg>
                编辑
              </Link>
            </p>
          </header>

          <div
            className={
              toc.length >= 2
                ? "grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_228px]"
                : ""
            }
          >
            <article className="md-body min-w-0">
              <Markdown>{body}</Markdown>
            </article>
            {toc.length >= 2 ? (
              <aside className="hidden xl:block">
                <Toc items={toc} />
              </aside>
            ) : null}
          </div>

          <div className="mt-14 border-t border-line pt-6">
            <Link
              href="/study"
              className="group inline-flex items-center gap-2 text-[13px] text-ink-3 transition-colors duration-150 hover:text-accent"
            >
              <IconArrowRight className="h-3.5 w-3.5 -scale-x-100 transition-transform duration-150 group-hover:-translate-x-0.5" />
              回到书房
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // 2) 不是文章 → 尝试按目录解析（下钻视图）
  let dir: Awaited<ReturnType<typeof getStudyDir>>;
  try {
    dir = await getStudyDir(slug);
  } catch {
    return <PostError />;
  }
  if (!dir) notFound();

  const segments = decodeParts(slug);
  const name = segments[segments.length - 1] ?? "书房";
  const directPosts = dir.posts;
  const childSections: BrowserSection[] = dir.folders.map((folder) => ({
    folder: { name: folder.name, path: folder.path, total: folder.total },
    posts: dir.allPosts
      .filter((p) => parentDir(p.path) === folder.path)
      .map(toBrowserPost),
  }));
  const total = dir.allPosts.filter((p) => p.path.startsWith(`${dir.path}/`)).length;

  const sections: BrowserSection[] = [
    { folder: null, posts: directPosts.map(toBrowserPost) },
    ...childSections,
  ];

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <Breadcrumb segments={segments} />
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            {name}
          </h1>
          <p className="max-w-[34em] text-ink-2">
            {dir.folders.length > 0 ? `${dir.folders.length} 个子文件夹 · ` : ""}
            共 {total} 篇
            {directPosts.length > 0 ? `（本层 ${directPosts.length} 篇）` : ""}
          </p>
        </header>

        <div data-floor-nav>
          <StudyBrowser
            sections={sections}
            allPosts={dir.allPosts.map(toBrowserPost)}
            placeholder="全量搜索文章（标题、摘要、标签、目录）…"
          />
        </div>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
