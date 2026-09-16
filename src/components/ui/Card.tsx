/** 卡片容器：描边 + 内边距档位（md 表单容器 / sm 内容小卡 / none 自定义）。 */
export default function Card({
  padding = "md",
  className = "",
  children,
  ...rest
}: {
  padding?: "md" | "sm" | "none";
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const pads = { md: "p-5 md:p-6", sm: "px-5 py-4", none: "" } as const;
  return (
    <div className={`rounded-ctl border border-line ${pads[padding]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
