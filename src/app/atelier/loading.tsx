import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";

/** 陈列廊路由级载入态：组件展示分区骨架。 */
export default function AtelierLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-32 animate-pulse rounded-[5px] bg-line" />
      {[0, 1].map((i) => (
        <div key={i} className="mb-10">
          <div className="mb-5 border-b border-line pb-3">
            <div className="h-4 w-28 animate-pulse rounded-[4px] bg-line" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((j) => (
              <Card key={j} className="animate-pulse">
                <div className="mb-3 h-4 w-1/2 rounded-[4px] bg-line" />
                <div className="h-16 rounded-ctl bg-line" />
              </Card>
            ))}
          </div>
        </div>
      ))}
      <Loading label="布置陈列中…" size="sm" />
    </div>
  );
}
