import { ButtonLink } from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/**
 * 未配置时的上手教程（各房间共用）：标题 + 编号步骤 + 可折叠格式示例 + 去设置入口。
 * 只在「内容源未连接」这一种空态下出现——网络失败等仍走 EmptyState。
 */
export default function SetupGuide({
  title,
  sub,
  steps,
  examples,
  actionHref = "/connect",
  actionLabel = "去设置",
}: {
  title: string;
  sub: string;
  steps: string[];
  /** 数据文件格式示例：折叠展示，不挤占步骤 */
  examples?: { label: string; code: string }[];
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-[560px]">
        <p className="mb-2 text-center font-serif text-[19px] tracking-[0.02em]">{title}</p>
        <p className="mb-6 text-center text-[13px] text-ink-3">{sub}</p>
        <Card padding="sm" className="bg-raised">
          <ol className="space-y-3.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-medium text-accent-ink tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="text-[13.5px] leading-[1.7] text-ink-2">{step}</span>
              </li>
            ))}
          </ol>
          {examples && examples.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              {examples.map((ex) => (
                <details key={ex.label} className="group/example">
                  <summary className="cursor-pointer list-none text-[12.5px] text-ink-3 transition-colors duration-150 hover:text-ink-2">
                    <span className="mr-1.5 inline-block transition-transform duration-150 group-open/example:rotate-90">▸</span>
                    {ex.label}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-ctl border border-line bg-wash px-3 py-2.5 text-[12px] leading-[1.65] text-ink-2">
                    <code>{ex.code}</code>
                  </pre>
                </details>
              ))}
            </div>
          ) : null}
        </Card>
        <p className="mt-6 text-center">
          <ButtonLink href={actionHref} variant="secondary">
            {actionLabel}
          </ButtonLink>
        </p>
      </div>
    </div>
  );
}
