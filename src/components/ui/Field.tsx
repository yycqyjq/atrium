import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** 表单字段统一样式（输入框 / 文本域 / 标签）。 */
export function fieldClasses(
  opts: { size?: "md" | "sm"; mono?: boolean; extra?: string } = {},
) {
  const { size = "md", mono = false, extra = "" } = opts;
  const sizeCls =
    size === "sm"
      ? "px-3 py-1.5 text-[12.5px]"
      : (mono ? "px-3.5 py-2.5 text-[13px]" : "px-3.5 py-2.5 text-[13.5px]") +
        " [[data-density=compact]_&]:px-3 [[data-density=compact]_&]:py-1.5 [[data-density=compact]_&]:text-[12.5px]";
  const monoCls = mono ? " font-mono leading-relaxed" : "";
  return `w-full rounded-ctl border border-line bg-raised outline-none transition-colors duration-150 placeholder:text-ink-3 hover:border-line-strong focus:border-accent ${sizeCls}${monoCls} ${extra}`.trim();
}

/**
 * 字段标签。`action` 为可选的右侧插槽（如字段级的操作按钮），
 * 传了就和标签排成一行，不传则与原来完全一致。
 */
export function FieldLabel({
  htmlFor,
  action,
  children,
}: {
  htmlFor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelCls = "text-[11.5px] tracking-[0.1em] text-ink-3";

  // 无插槽时保持原样（单个 label），避免给既有调用点多套一层容器
  if (!action) {
    return (
      <label className={`mb-1.5 block ${labelCls}`} htmlFor={htmlFor}>
        {children}
      </label>
    );
  }

  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label className={`block ${labelCls}`} htmlFor={htmlFor}>
        {children}
      </label>
      {action}
    </div>
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
