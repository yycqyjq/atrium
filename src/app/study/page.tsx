import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import StudyBrowser, { type BrowserPost, type BrowserSection } from "@/components/study/StudyBrowser";
import FloorNav from "@/components/shell/FloorNav";
import { studyIndex, type ContentReason, type PostMeta } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "书房" };

const parentDir = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

function toBrowserPost(post: PostMeta): BrowserPost {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    dateLabel: post.dateLabel,
    folder: parentDir(post.path),
    tags: post.tags,
  };
}

function emptyCopy(reason: ContentReason) {
  if (reason === "not-configured") {
    return { title: "还没有接通内容源。", sub: "配置仓库后，这里会亮起来。" };
  }
  if (reason === "fetch-failed") {
    return { title: "内容源暂时连不上。", sub: "检查网络或访问令牌，稍后再试。" };
  }
  return { title: "书房还是空的。", sub: "在仓库里写下第一篇 Markdown，这里就会亮起来。" };
}

export default async function StudyPage() {
  const { posts, folders, reason } = await studyIndex();
  const copy = emptyCopy(reason);

  const rootPosts = posts.filter((post) => parentDir(post.path) === "");
  const topFolders = folders.filter((folder) => folder.depth === 1);

  const sections: BrowserSection[] = [
    { folder: null, posts: rootPosts.map(toBrowserPost) },
    ...topFolders.map((folder) => ({
      folder: { name: folder.name, path: folder.path, total: folder.total },
      posts: posts.filter((post) => parentDir(post.path) === folder.path).map(toBrowserPost),
    })),
  ];

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">书房</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            书房
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="max-w-[34em] text-ink-2">文章与长文，按文件夹归档。读也好，写也好，都在这里。</p>
            <Link
              href="/study/write"
              className="group inline-flex items-center gap-1.5 text-[12.5px] tracking-[0.03em] text-accent transition-colors duration-150 hover:text-accent-hover"
            >
              写作台
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px] transition-transform duration-200 group-hover:translate-x-0.5">
                <path d="M5 12 H19" />
                <path d="M13.5 6.5 L19 12 L13.5 17.5" />
              </svg>
            </Link>
          </div>
        </header>

        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{copy.title}</p>
            <p className="text-[13px] text-ink-3">{copy.sub}</p>
          </div>
        ) : (
          <div data-floor-nav>
            <StudyBrowser
              sections={sections}
              allPosts={posts.map(toBrowserPost)}
              placeholder="全量搜索文章（标题、摘要、标签、目录）…"
            />
          </div>
        )}
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
