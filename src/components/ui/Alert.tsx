/** 提示条：错误（强调浅底）与常规（描边浅面）两种色调。 */
export default function Alert({
  tone = "error",
  size = "md",
  className = "",
  children,
}: {
  tone?: "error" | "ok";
  size?: "md" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    error: "border-accent bg-accent-soft text-accent-ink",
    ok: "border-line bg-raised text-ink-2",
  } as const;
  const sizes = {
    md: "px-4 py-2.5 text-[13px] [[data-density=compact]_&]:py-2",
    sm: "px-4 py-2 text-[12.5px] [[data-density=compact]_&]:py-1.5",
  } as const;
  return (
    <p className={`rounded-ctl border ${sizes[size]} ${tones[tone]} ${className}`}>{children}</p>
  );
}
