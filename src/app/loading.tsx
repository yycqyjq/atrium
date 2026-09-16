import Loading from "@/components/ui/Loading";

/** 全局载入态：路由切换与首屏等待时的轻量提示（公共 Loading 组件） */
export default function LoadingPage() {
  return (
    <div className="flex min-h-[46vh] items-center justify-center">
      <Loading />
    </div>
  );
}
