export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`mt-auto flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-[18px] text-[12.5px] text-ink-3 ${className}`}
    >
      <span>中庭是个人空间，内容存放在你的代码仓库里。</span>
      <span>© 2026 yycqyjq</span>
    </footer>
  );
}
