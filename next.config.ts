import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * standalone：产出可独立运行的 Server 产物。
   * 配合 Electron「本地服务」路线：主进程拉起该服务后加载窗口。
   */
  output: "standalone",
};

export default nextConfig;
