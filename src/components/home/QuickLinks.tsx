import { IconExternal } from "@/components/icons";

const links = (githubUrl: string) => [
  { href: githubUrl, name: "GitHub", note: "代码与仓库" },
  { href: "https://developer.mozilla.org", name: "MDN", note: "Web 文档" },
  { href: "https://www.figma.com", name: "Figma", note: "设计与原型" },
  { href: "https://unsplash.com", name: "Unsplash", note: "图片素材" },
];

export default function QuickLinks({
  githubUrl,
  className = "",
}: {
  githubUrl: string;
  className?: string;
}) {
  return (
    <section className={`mt-14 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-5">
        <h2 className="font-serif text-[21px] font-semibold tracking-[0.04em]">常用</h2>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-x-8 gap-y-3 max-xs:grid-cols-2">
        {links(githubUrl).map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col gap-[3px] py-1 pb-1.5"
            >
              <span className="flex items-center gap-1.5 font-serif text-[17px] tracking-[0.02em] text-ink">
                {link.name}
                <IconExternal className="h-3 w-3 text-ink-3" />
              </span>
              <span className="text-[12.5px] text-ink-3">{link.note}</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0.5 h-px origin-left scale-x-0 bg-line-strong transition-transform duration-200 group-hover:scale-x-100"
              />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-[34px] text-[12.5px] text-ink-3">
        内容来自你配置的仓库；在设置页或环境变量里更换数据源。
      </p>
    </section>
  );
}
