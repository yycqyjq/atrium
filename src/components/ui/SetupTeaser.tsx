import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

/**
 * 内容源未连接时的极简空态：一句话 + 去设置 + 指向使用教程。
 * 完整步骤集中在 /guide，房间内不再重复教程。
 */
export default function SetupTeaser({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-[520px] text-center">
        <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{title}</p>
        <p className="mb-6 text-[13px] leading-[1.9] text-ink-3">
          {sub} 完整步骤见{" "}
          <Link
            href="/guide#connect"
            className="text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors duration-150 hover:decoration-accent"
          >
            使用教程
          </Link>
          ，或直接去设置。
        </p>
        <ButtonLink href="/connect" variant="secondary">去设置</ButtonLink>
      </div>
    </div>
  );
}
