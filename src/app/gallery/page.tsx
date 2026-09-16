import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import GalleryUpload from "@/components/gallery/GalleryUpload";
import EmptyState from "@/components/ui/EmptyState";
import Chip from "@/components/ui/Chip";
import { listGallery, type ContentReason } from "@/lib/gallery";
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

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; view?: string }>;
}) {
  const { album, view } = await searchParams;
  const { albums, images, current, dir, reason } = await listGallery(album);
  const viewNum = view != null ? Number.parseInt(view, 10) : Number.NaN;
  const copy = emptyCopy(reason, dir);
  const galleryCfg = await resolveGalleryConfig();
  const canUpload = Boolean(galleryCfg.token);

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">画廊</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            画廊
          </h1>
          <p className="max-w-[34em] text-ink-2">照片与影像。存放目光的地方。</p>
        </header>

        {canUpload ? <GalleryUpload dir={current ?? ""} albums={albums.map((a) => a.name)} /> : null}

        {albums.length > 0 || current ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Chip href="/gallery" active={!current}>
              全部
            </Chip>
            {albums.map((item) => (
              <Chip key={item.path} href={`/gallery?album=${encodeURIComponent(item.name)}`} active={current === item.name}>
                {item.name}
              </Chip>
            ))}
          </div>
        ) : null}

        {images.length === 0 ? (
          <EmptyState title={copy.title} sub={copy.sub} />
        ) : (
          <>
            <GalleryGrid images={images} initialView={Number.isInteger(viewNum) ? viewNum : undefined} />
            <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">共 {images.length} 张</p>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
