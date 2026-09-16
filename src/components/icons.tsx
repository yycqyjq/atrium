import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** 品牌标志：回字形天井（与 design/ 样板一致） */
export function IconMark(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base} {...props}>
      <rect x="4.5" y="4.5" width="23" height="23" />
      <rect x="13" y="13" width="6" height="6" />
      <path d="M16 4.5 V13 M16 19 V27.5 M4.5 16 H13 M19 16 H27.5" />
    </svg>
  );
}

/** 导航：中庭（简化回字） */
export function IconHome(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

/** 书房：摊开的书 */
export function IconBook(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 6.6 C10.2 5.3 7.4 4.9 4.5 5.5 V18.3 C7.4 17.7 10.2 18.1 12 19.4 C13.8 18.1 16.6 17.7 19.5 18.3 V5.5 C16.6 4.9 13.8 5.3 12 6.6 Z" />
      <path d="M12 6.6 V19.4" />
    </svg>
  );
}

/** 画廊：画框 */
export function IconFrame(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="4" y="5" width="16" height="14" />
      <circle cx="9.2" cy="10" r="1.6" />
      <path d="M4 16.6 L9.4 12.3 L13.2 15.1 L15.8 12.9 L20 16.4" />
    </svg>
  );
}

/** 工具房：工具箱 */
export function IconToolbox(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="4" y="9.5" width="16" height="10" />
      <path d="M9.5 9.5 V7.8 C9.5 6.8 10.3 6 11.3 6 H12.7 C13.7 6 14.5 6.8 14.5 7.8 V9.5" />
      <path d="M4 14.5 H20" />
    </svg>
  );
}

/** 陈列廊：柱廊 */
export function IconColumns(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 9.5 H20" />
      <path d="M5.5 9.5 V19.5 M12 9.5 V19.5 M18.5 9.5 V19.5" />
      <path d="M3.5 19.5 H20.5" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M19.3 14.1 A7.5 7.5 0 1 1 9.9 4.7 A6 6 0 0 0 19.3 14.1 Z" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 4.2 V6.3 M12 17.7 V19.8 M4.2 12 H6.3 M17.7 12 H19.8 M6.5 6.5 L7.9 7.9 M16.1 16.1 L17.5 17.5 M17.5 6.5 L16.1 7.9 M7.9 16.1 L6.5 17.5" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 12 H19 M13.5 6.5 L19 12 L13.5 17.5" />
    </svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}>
      <path d="M7 17 L17 7 M9.5 7 H17 V14.5" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7 17 L17 7" />
      <path d="M9 7 H17 V15" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 5 V19 M5 12 H19" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 20 H8 L19 9 C19.8 8.2 19.8 7 19 6.2 L17.8 5 C17 4.2 15.8 4.2 15 5 L4 16 Z" />
    </svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M14.5 5.5 L8 12 L14.5 18.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9.5 5.5 L16 12 L9.5 18.5" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 L20 20" />
    </svg>
  );
}
export function IconLink(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M10.5 13.5 L13.5 10.5" />
      <path d="M9 7 L11 5 C12.4 3.6 14.6 3.6 16 5 L19 8 C20.4 9.4 20.4 11.6 19 13 L17 15" />
      <path d="M15 17 L13 19 C11.6 20.4 9.4 20.4 8 19 L5 16 C3.6 14.6 3.6 12.4 5 11 L7 9" />
    </svg>
  );
}

export function IconCraft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6.5 H18 M12 6.5 V17.5 M7.5 17.5 H16.5" />
    </svg>
  );
}
