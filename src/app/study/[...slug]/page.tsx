import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/shell/Footer";
import Markdown from "@/components/study/Markdown";
import Toc from "@/components/study/Toc";
import StudyBrowser, { type BrowserSection } from "@/components/study/StudyBrowser";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import Loading from "@/components/ui/Loading";
import Breadcrumb, { type Crumb } from "@/components/ui/Breadcrumb";
import BackLink from "@/components/ui/BackLink";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight, IconPencil, IconLink } from "@/components/icons";
import { getPostBySlug, getStudyDir, type PostMeta } from "@/lib/content";
import { splitReferenceLinks } from "@/lib/reference-links";
import { extractToc } from "@/lib/toc";
import { isWriteEnabled } from "@/lib/write-guard";
import ReadingProgress from "@/components/study/ReadingProgress";

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
          <ButtonLink href="/study" variant="secondary">
            <IconArrowRight className="h-3.5 w-3.5 -scale-x-100" />
            回到书房
          </ButtonLink>
        </div>
      </div>
      <Footer />
    </>
  );
}

/** 书房面包屑：中庭 / 书房 / 段1 / 段2 …（中间段可点击） */
function studyCrumbs(segments: string[]): Crumb[] {
  return [
    { label: "中庭", href: "/" },
    { label: "书房", href: "/study" },
    ...segments.map((segment, i) => ({
      label: segment,
      href:
        i < segments.length - 1
          ? `/study/${segments
              .slice(0, i + 1)
              .map(encodeURIComponent)
              .join("/")}`
          : undefined,
    })),
  ];
}

export default function StudySlugPage({ params }: Props) {
  return (
    <Suspense fallback={<Loading className="my-24" />}>
      <StudySlugBody params={params} />
    </Suspense>
  );
}

async function StudySlugBody({ params }: Props) {
  const { slug } = await params;

  // 1) 先按文章解析
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    return <PostError />;
  }

  if (post) {
    const { meta } = post;
    const { body, links } = splitReferenceLinks(post.body);
    const minutes = Math.max(1, Math.round(body.length / 400));
    const toc = extractToc(body);
    const folderSegments = meta.slug.split("/").slice(0, -1);

    return (
      <>
        <ReadingProgress />
        <div className="mb-[72px]">
          <header className="pt-4 pb-9">
            <Breadcrumb items={studyCrumbs(folderSegments)} className="mb-3" />
            <h1 className="mb-4 max-w-[26em] font-serif text-[clamp(28px,3.6vw,38px)] font-semibold leading-[1.22] tracking-[0.02em]">
              {meta.title}
            </h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
              {meta.lastModified ? (
                <span className="tabular-nums">{fullDate(meta.lastModified)}</span>
              ) : null}
              <span className="tabular-nums">约 {minutes} 分钟读完</span>
              {meta.tags.length > 0 ? (
                <span className="tracking-[0.03em]">
                  {meta.tags.map((tag) => `#${tag}`).join("  ")}
                </span>
              ) : null}
              <Link
                href={`/study/write?edit=${encodeURIComponent(meta.slug)}`}
                className="group ml-auto inline-flex items-center gap-1.5 text-accent transition-colors duration-150 hover:text-accent-hover"
              >
                <IconPencil className="size-[13px]" />
                编辑
              </Link>
            </p>
          </header>

          <div
            className={
              toc.length >= 2
                ? "grid grid-cols-1 gap-10 toc:grid-cols-[minmax(0,1fr)_176px] toc:gap-7 xl:grid-cols-[minmax(0,1fr)_228px] xl:gap-10"
                : ""
            }
          >
            <article className="md-body min-w-0">
              <Markdown>{body}</Markdown>
            </article>
            {toc.length >= 2 ? (
              <aside className="hidden toc:block">
                <Toc items={toc} />
              </aside>
            ) : null}
          </div>

          {links.length > 0 ? (
            <section className="mt-12 max-w-[44em] border-t border-line pt-6">
              <h2 className="mb-3 font-serif text-[15px] tracking-[0.08em] text-ink-2">参考资源</h2>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.url} className="flex items-start gap-2.5">
                    <IconLink className="mt-[3.5px] size-[13px] shrink-0 text-accent" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-[13.5px] leading-relaxed text-ink-2 underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent hover:decoration-accent/50"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-14 border-t border-line pt-6">
            <BackLink href="/study">回到书房</BackLink>
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
        <PageHeader
          crumbs={studyCrumbs(segments)}
          title={name}
          subtitle={`${dir.folders.length > 0 ? `${dir.folders.length} 个子文件夹 · ` : ""}共 ${total} 篇${
            directPosts.length > 0 ? `（本层 ${directPosts.length} 篇）` : ""
          }`}
        />

        <div data-floor-nav>
          <StudyBrowser
            sections={sections}
            allPosts={dir.allPosts.map(toBrowserPost)}
            placeholder="全量搜索文章（标题、摘要、目录）…"
            manageable={isWriteEnabled()}
          />
        </div>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
