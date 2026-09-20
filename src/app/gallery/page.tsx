import { Suspense } from "react";
import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import FloorNav from "@/components/shell/FloorNav";
import GalleryBrowser from "@/components/gallery/GalleryBrowser";
import GalleryUpload from "@/components/gallery/GalleryUpload";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import SetupGuide from "@/components/ui/SetupGuide";
import PageHeader from "@/components/ui/PageHeader";
import { listGallerySections, type ContentReason } from "@/lib/gallery";
import { resolveGalleryConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "画廊" };

function emptyCopy(reason: ContentReason, dir: string) {
  if (reason === "not-configured") {
    return {
      title: "还没有接通图片源。",
      sub: "配置仓库后，这里会亮起来。",
    };
  }
  if (reason === "fetch-failed") {
    return {
      title: "图片源暂时连不上。",
      sub: "检查网络或访问令牌，稍后再试。",
    };
  }
  return {
    title: "画廊还是空的。",
    sub: `把图片放进仓库的 ${dir}/ 目录，刷新就能看到。`,
  };
}

/** 画廊：按相册（子目录）逐卷铺开 + 即时搜索；灯箱沿用 ?album=&view= 深链 */
async function GalleryFloor({ album, view }: { album?: string; view?: string }) {
  const { sections, dir, reason } = await listGallerySections();
  const viewNum = view != null ? Number.parseInt(view, 10) : Number.NaN;
  const copy = emptyCopy(reason, dir);
  const galleryCfg = await resolveGalleryConfig();
  const canUpload = Boolean(galleryCfg.token);
  const total = sections.reduce((n, section) => n + section.images.length, 0);

  if (reason === "not-configured") {
    return (
      <SetupGuide
        title="画廊还没接通图片源。"
        sub="连好仓库，照片就有了落脚的地方。"
        steps={[
          "点侧栏底部的头像或 ⚙ 齿轮，打开「设置」页。",
          "填入 GitHub 用户名、仓库名与令牌（上传照片必须有令牌）。",
          `图片放进仓库的 ${dir}/ 目录；想和文章分家，也可以单独指定一个图床仓库。`,
          "保存后回画廊：相册自动铺开，之后还能直接在页面上上传。",
        ]}
      />
    );
  }

  return (
    <>
      {canUpload ? (
        <GalleryUpload dir="" albums={sections.filter((s) => s.key !== "__root__").map((s) => s.name)} />
      ) : null}

      {total === 0 ? (
        <EmptyState title={copy.title} sub={copy.sub} />
      ) : (
        <GalleryBrowser
          sections={sections}
          canEdit={canUpload}
          initialAlbum={album}
          initialView={Number.isInteger(viewNum) ? viewNum : undefined}
        />
      )}
    </>
  );
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; view?: string }>;
}) {
  const { album, view } = await searchParams;

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "画廊" }]}
          title="画廊"
          subtitle="照片与影像。存放目光的地方。"
        />

        <Suspense fallback={<Loading className="my-24" />}>
          <GalleryFloor album={album} view={view} />
        </Suspense>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
