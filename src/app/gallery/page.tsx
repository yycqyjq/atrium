import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import FloorNav from "@/components/shell/FloorNav";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import GalleryUpload from "@/components/gallery/GalleryUpload";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
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

/** 画廊：按相册（子目录）逐卷铺开，楼层目录导航；灯箱沿用 ?album=&view= 深链 */
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; view?: string }>;
}) {
  const { album, view } = await searchParams;
  const { sections, dir, reason } = await listGallerySections();
  const viewNum = view != null ? Number.parseInt(view, 10) : Number.NaN;
  const copy = emptyCopy(reason, dir);
  const galleryCfg = await resolveGalleryConfig();
  const canUpload = Boolean(galleryCfg.token);
  const total = sections.reduce((n, section) => n + section.images.length, 0);
  const flat = sections.flatMap((section) => section.images);
  let cursor = 0;

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "画廊" }]}
          title="画廊"
          subtitle="照片与影像。存放目光的地方。"
        />

        {canUpload ? (
          <GalleryUpload dir="" albums={sections.filter((s) => s.key !== "__root__").map((s) => s.name)} />
        ) : null}

        {total === 0 ? (
          <EmptyState title={copy.title} sub={copy.sub} />
        ) : (
          <div data-floor-nav>
            {sections.map((section) => {
              const contextStart = cursor;
              cursor += section.images.length;
              return (
                <section key={section.key} className="mb-10">
                  <SectionHeading
                    id={`album-${section.slug}`}
                    title={section.name}
                    count={`${section.images.length} 张`}
                    className="mb-4"
                  />
                  <GalleryGrid
                    images={section.images}
                    contextImages={flat}
                    contextStart={contextStart}
                    initialView={album === section.name && Number.isInteger(viewNum) ? viewNum : undefined}
                    canEdit={canUpload}
                  />
                </section>
              );
            })}
            <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">共 {total} 张</p>
          </div>
        )}
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
