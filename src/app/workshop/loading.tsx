import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";

/** 工坊列表路由级载入态：展品卡网格骨架。 */
export default function WorkshopLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-28 animate-pulse rounded-[5px] bg-line" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="mb-3 h-4 w-2/3 rounded-[4px] bg-line" />
            <div className="h-20 rounded-ctl bg-line" />
          </Card>
        ))}
      </div>
      <Loading label="开箱中…" size="sm" className="mt-8" />
    </div>
  );
}
