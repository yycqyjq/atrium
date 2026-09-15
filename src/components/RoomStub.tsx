import Link from "next/link";
import { IconArrowRight, IconBook, IconColumns, IconFrame, IconToolbox } from "@/components/icons";
import Footer from "@/components/shell/Footer";

const ROOM_ICONS = {
  study: IconBook,
  gallery: IconFrame,
  tools: IconToolbox,
  atelier: IconColumns,
} as const;

type Room = keyof typeof ROOM_ICONS;

export default function RoomStub({
  room,
  title,
  sub,
  text,
}: {
  room: Room;
  title: string;
  sub: string;
  text: string;
}) {
  const Icon = ROOM_ICONS[room];

  return (
    <>
      <div className="mb-[72px] flex grow flex-col">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">{title}</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            {title}
          </h1>
          <p className="max-w-[34em] text-ink-2">{sub}</p>
        </header>

        <div className="mx-auto my-auto flex max-w-[480px] flex-col items-center text-center max-xs:my-4">
          <div aria-hidden className="mb-6 text-line-strong">
            <Icon className="h-16 w-16" strokeWidth={0.7} />
          </div>
          <p className="mb-3 font-serif text-[23px] font-semibold tracking-[0.03em]">
            骨架已就位。
          </p>
          <p className="mb-7 max-w-[28em] text-sm text-ink-2 [word-break:keep-all] text-balance">
            {text}页面框架已经搭好，数据与内容会在后续迁移中接进来。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-ctl bg-accent px-[18px] py-[9px] text-[13px] tracking-[0.02em] text-on-accent transition-colors duration-150 hover:bg-accent-hover active:translate-y-px"
          >
            回到中庭
            <IconArrowRight className="h-[15px] w-[15px]" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
