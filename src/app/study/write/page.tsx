import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import WriteDesk from "@/components/study/WriteDesk";
import { getProvider } from "@/lib/providers";
import { splitReferenceLinks } from "@/lib/reference-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "写作台" };

/** 编辑已有文章：/study/write?edit=<slug> */
export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  let initial: { slug: string; title: string; body: string; refs?: string } | undefined;
  if (edit) {
    try {
      const provider = await getProvider();
      const raw = await provider.getFile(`${edit}.md`);
      const text = Buffer.from(raw.content, "base64").toString("utf8");
      const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      const fm = m?.[1] ?? "";
      const rawBody = (m?.[2] ?? text).replace(/^\n+/, "");
      const pick = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm)?.[1]?.trim().replace(/^"|"$/g, "") ?? "";

      // 参考链接：从正文尾部提取，回填到输入框（编辑后原样写回）
      const { body, links } = splitReferenceLinks(rawBody);
      const refs = links.map((l) => (l.label === l.url ? l.url : `[${l.label}](${l.url})`)).join("\n");

      // 标题自动识别：front-matter 优先，缺省回退文件名（去扩展名）
      const fileName = (edit.split("/").pop() ?? edit).replace(/\.mdx?$/i, "");
      const title = pick("title") || fileName;

      initial = { slug: edit, title, body, refs };
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
