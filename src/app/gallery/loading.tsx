import Loading from "@/components/ui/Loading";

/** 画廊路由级载入态：图片网格骨架。 */
export default function GalleryLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-32 animate-pulse rounded-[5px] bg-line" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-36 rounded-ctl bg-line" />
            <div className="mt-2 h-3 w-2/3 rounded-[4px] bg-line" />
          </div>
        ))}
      </div>
      <Loading label="取图中…" size="sm" className="mt-8" />
    </div>
  );
}
