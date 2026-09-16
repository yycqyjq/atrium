import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** 表单字段统一样式（输入框 / 文本域 / 标签）。 */
export function fieldClasses(
  opts: { size?: "md" | "sm"; mono?: boolean; extra?: string } = {},
) {
  const { size = "md", mono = false, extra = "" } = opts;
  const sizeCls =
    size === "sm" ? "px-3 py-1.5 text-[12.5px]" : mono ? "px-3.5 py-2.5 text-[13px]" : "px-3.5 py-2.5 text-[13.5px]";
  const monoCls = mono ? " font-mono leading-relaxed" : "";
  return `w-full rounded-ctl border border-line bg-raised outline-none transition-colors duration-150 placeholder:text-ink-3 hover:border-line-strong focus:border-accent ${sizeCls}${monoCls} ${extra}`.trim();
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11.5px] tracking-[0.1em] text-ink-3" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Input({
  size = "md",
  className = "",
  ...rest
}: { size?: "md" | "sm"; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "size">) {
  return <input className={fieldClasses({ size, extra: className })} {...rest} />;
}

export function Textarea({
  size = "md",
  mono = false,
  className = "",
  ...rest
}: {
  size?: "md" | "sm";
  mono?: boolean;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={fieldClasses({ size, mono, extra: className })} {...rest} />;
}
