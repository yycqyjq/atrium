import { readStoredConfig } from "@/lib/config";

export default async function Footer({ className = "" }: { className?: string }) {
  const cfg = await readStoredConfig();
  const text = cfg.footerText?.trim() || "中庭是个人空间，内容存放在你的代码仓库里。";
  const owner = cfg.repos?.github?.owner?.trim();
  const year = new Date().getFullYear();
  return (
    <footer
      className={`mt-auto flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-[18px] text-[12.5px] text-ink-3 ${className}`}
    >
      <span>{text}</span>
      <span>
        © {year}
        {owner ? ` ${owner}` : ""}
      </span>
    </footer>
  );
}
