import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import { listGallery, type ContentReason } from "@/lib/gallery";

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

        {albums.length > 0 || current ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Link
              href="/gallery"
              className={`rounded-ctl border px-[13px] py-[5px] text-[12.5px] tracking-[0.03em] transition-colors duration-150 ${
                current
                  ? "border-line text-ink-3 hover:border-line-strong hover:text-ink-2"
                  : "border-accent bg-accent-soft font-medium text-accent-ink"
              }`}
            >
              全部
            </Link>
            {albums.map((item) => (
              <Link
                key={item.path}
                href={`/gallery?album=${encodeURIComponent(item.name)}`}
                className={`rounded-ctl border px-[13px] py-[5px] text-[12.5px] tracking-[0.03em] transition-colors duration-150 ${
                  current === item.name
                    ? "border-accent bg-accent-soft font-medium text-accent-ink"
                    : "border-line text-ink-3 hover:border-line-strong hover:text-ink-2"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}

        {images.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{copy.title}</p>
            <p className="text-[13px] text-ink-3">{copy.sub}</p>
          </div>
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
