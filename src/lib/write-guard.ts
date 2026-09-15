/**
 * 写保护开关：所有写接口（文章/书签/图片）仅在显式启用时可用。
 *
 * - 桌面 App / 本机开发：启动脚本与 Electron 主进程注入 ATRIUM_ALLOW_WRITE=1 → 可写
 * - Vercel 等公开部署：默认不设置 → 全部写接口返回 403（站点对访客只读，无需额外鉴权即安全）
 *
 * 如未来要在公开环境开放写作，必须先补齐身份鉴权，再显式设置该变量。
 */
export function isWriteEnabled(): boolean {
  return process.env.ATRIUM_ALLOW_WRITE === "1";
}

export const WRITE_DISABLED_MESSAGE = "当前环境未开放写入（线上部署默认只读）。";
