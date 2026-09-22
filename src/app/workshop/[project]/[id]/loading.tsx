import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";

/** 工坊展品页路由级载入态：点击工具后立即反馈，避免跳转期间「卡住」的观感。 */
export default function WorkshopLoading() {
  return (
    <div className="mx-auto max-w-[880px]">
      <Card className="bg-raised">
        <div className="mb-4 h-7 w-40 animate-pulse rounded-[5px] bg-line" />
        <div className="mb-6 h-[280px] animate-pulse rounded-ctl border border-line bg-surface" />
        <Loading label="取件中…" />
      </Card>
    </div>
  );
}
