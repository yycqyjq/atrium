import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import { listTools } from "@/lib/tools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工具房" };

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function ToolsPage() {
  const { groups, count, reason } = await listTools();

  const emptyCopy =
    reason === "not-configured"
      ? { title: "还没有接通内容源。", sub: "配置仓库后，这里会亮起来。" }
      : reason === "fetch-failed"
        ? { title: "工具清单暂时读不到。", sub: "检查网络或仓库访问，稍后再试。" }
        : { title: "还没有工具清单。", sub: "把 tools.json 放进仓库的 admin/ 目录，刷新就能看到。" };

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">工具房</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            工具房
          </h1>
          <p className="max-w-[34em] text-ink-2">书签与常用工具。顺手就能拿到。</p>
        </header>

        {count === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-2 font-serif text-[19px] tracking-[0.02em]">{emptyCopy.title}</p>
            <p className="text-[13px] text-ink-3">{emptyCopy.sub}</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.name} className="mb-10">
                <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
                  <h2 className="font-serif text-[17px] tracking-[0.02em]">{group.name}</h2>
                  <span className="text-[12px] text-ink-3">{group.items.length} 个</span>
                </div>
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((tool) => (
                    <li key={`${tool.category}/${tool.name}`}>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block rounded-ctl border border-line px-4 py-3.5 transition-colors duration-200 hover:border-line-strong"
                      >
                        <span className="mb-0.5 flex items-start justify-between gap-3">
                          <span className="line-clamp-2 font-medium leading-snug tracking-[0.01em] transition-colors duration-200 group-hover:text-accent">
                            {tool.name}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="size-[13px] shrink-0 text-ink-3 transition-colors duration-200 group-hover:text-accent"
                          >
                            <path d="M7 17 L17 7" />
                            <path d="M9 7 H17 V15" />
                          </svg>
                        </span>
                        <span className="block text-[12px] tracking-[0.03em] text-ink-3">
                          {hostOf(tool.url)}
                        </span>
                        {tool.description ? (
                          <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-2">
                            {tool.description}
                          </span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="text-[12.5px] tracking-[0.05em] text-ink-3">共 {count} 个工具</p>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
