/**
 * 空态：标题（衬线）+ 副文案。room 用于房间级空态，search 用于搜索无结果。
 * 公共组件——各房间共用，勿在页面内重写。
 */
export default function EmptyState({
  title,
  sub,
  variant = "room",
}: {
  title: string;
  sub: string;
  variant?: "room" | "search";
}) {
  const room = variant === "room";
  return (
    <div className={`text-center ${room ? "py-16" : "py-14"}`}>
      <p className={`mb-2 font-serif tracking-[0.02em] ${room ? "text-[19px]" : "text-[17px]"}`}>
        {title}
      </p>
      <p className="text-[13px] text-ink-3">{sub}</p>
    </div>
  );
}
