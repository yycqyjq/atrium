import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";

/** 书房路由级载入态：文章行列表骨架。 */
export default function StudyLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-40 animate-pulse rounded-[5px] bg-line" />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="mb-3">
          <div className="animate-pulse">
            <div className="mb-2 h-4 w-2/3 rounded-[4px] bg-line" />
            <div className="mb-2 h-3 w-full rounded-[4px] bg-line" />
            <div className="h-3 w-1/4 rounded-[4px] bg-line" />
          </div>
        </Card>
      ))}
      <Loading label="取文中…" size="sm" />
    </div>
  );
}
