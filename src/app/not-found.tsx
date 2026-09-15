import Link from "next/link";
import Footer from "@/components/shell/Footer";

export default function NotFound() {
  return (
    <>
      <div className="mb-[72px] flex grow flex-col">
        <div className="mx-auto my-auto flex max-w-[480px] flex-col items-center text-center">
          <p className="mb-3 font-serif text-[23px] font-semibold tracking-[0.03em]">
            这间屋子还不存在。
          </p>
          <p className="mb-7 max-w-[26em] text-sm text-ink-2">
            你要找的页面没有找到，回中庭看看吧。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-ctl bg-accent px-[18px] py-[9px] text-[13px] tracking-[0.02em] text-on-accent transition-colors duration-150 hover:bg-accent-hover active:translate-y-px"
          >
            回到中庭
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
