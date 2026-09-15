import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import WriteDesk from "@/components/study/WriteDesk";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "写作台" };

/** 编辑已有文章：/study/write?edit=<slug> */
export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  let initial: { slug: string; title: string; description: string; date: string; tags: string[]; body: string } | undefined;
  if (edit) {
    try {
      const provider = await getProvider();
      const raw = await provider.getFile(`${edit}.md`);
      const text = Buffer.from(raw.content, "base64").toString("utf8");
      const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      const fm = m?.[1] ?? "";
      const body = m?.[2] ?? text;
      const pick = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm)?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
      initial = {
        slug: edit,
        title: pick("title"),
        description: pick("description"),
        date: pick("date") || new Date().toISOString().slice(0, 10),
        tags: /^\s*tags:\s*\[(.+)\]/m.exec(fm)?.[1]?.split(",").map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean) ?? [],
        body,
      };
    } catch {
      initial = undefined; // 找不到就当新建
    }
  }

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <Link href="/study" className="transition-colors duration-150 hover:text-accent">
              书房
            </Link>
            {" / "}
            <span className="text-ink-2">写作台</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            写作台
          </h1>
          <p className="max-w-[34em] text-ink-2">写完直接存回仓库。没有中间商。</p>
        </header>

        <WriteDesk initial={initial} />
      </div>
      <Footer />
    </>
  );
}
