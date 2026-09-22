import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";

/** 工具房路由级载入态：工具卡网格骨架。 */
export default function ToolsLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-32 animate-pulse rounded-[5px] bg-line" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="mb-3 h-4 w-1/2 rounded-[4px] bg-line" />
            <div className="mb-2 h-3 w-full rounded-[4px] bg-line" />
            <div className="h-3 w-3/4 rounded-[4px] bg-line" />
          </Card>
        ))}
      </div>
      <Loading label="取工具中…" size="sm" className="mt-8" />
    </div>
  );
}
