/** 全局载入态：路由切换与首屏等待时的轻量提示 */
export default function Loading() {
  return (
    <div className="flex min-h-[46vh] items-center justify-center">
      <p className="text-[13px] tracking-[0.12em] text-ink-3">载入中…</p>
    </div>
  );
}
