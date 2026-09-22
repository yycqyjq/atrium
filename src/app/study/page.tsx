import { Suspense } from "react";
import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import StudyBrowser, { type BrowserPost, type BrowserSection } from "@/components/study/StudyBrowser";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import Loading from "@/components/ui/Loading";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/icons";
import EmptyState from "@/components/ui/EmptyState";
import SetupTeaser from "@/components/ui/SetupTeaser";
import { studyIndex, type ContentReason, type PostMeta } from "@/lib/content";
import { isWriteEnabled } from "@/lib/write-guard";

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

async function StudyFloor() {
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

  if (reason === "not-configured") {
    return (
      <SetupTeaser
        title='书房还没接通内容源。'
        sub='几分钟连好仓库，之后写文章、读文章都在这里。'
      />
    );
  }

  if (posts.length === 0) return <EmptyState title={copy.title} sub={copy.sub} />;

  return (
    <div data-floor-nav>
      <StudyBrowser
        sections={sections}
        allPosts={posts.map(toBrowserPost)}
        placeholder="全量搜索文章（标题、摘要、目录）…"
        manageable={isWriteEnabled()}
      />
    </div>
  );
}

export default function StudyPage() {
  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "书房" }]}
          title="书房"
          subtitle="文章与长文，按文件夹归档。读也好，写也好，都在这里。"
          extra={
            <ButtonLink variant="text" href="/study/write" className="group">
              写作台
              <IconArrowRight className="size-[13px] transition-transform duration-200 group-hover:translate-x-0.5" />
            </ButtonLink>
          }
        />

        <Suspense fallback={<Loading className="my-24" />}>
          <StudyFloor />
        </Suspense>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
