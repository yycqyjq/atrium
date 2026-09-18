import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/shell/Sidebar";
import GlobalSearch from "@/components/search/GlobalSearch";
import { readPublicConfig } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await readPublicConfig();
  const name = cfg.siteName?.trim() || "中庭";
  return {
    title: { default: name, template: `%s - ${name}` },
    description: "中庭，个人数字空间。文章、画廊、工具与实验，共居一室。",
    alternates: {
      types: { "application/rss+xml": "/rss.xml" },
    },
  };
}

/**
 * 首帧前决定主题，避免闪烁：
 * 优先级 URL 参数 ?theme=dark|light（调试 / 分享用） > localStorage 记忆 > 系统偏好。
 */
const themeInit = `(function(){try{var q=new URLSearchParams(location.search).get("theme");var s=localStorage.getItem("atrium-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=(q==="dark"||q==="light")?q:((s==="light"||s==="dark")?s:(d?"dark":"light"));}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        <div className="grid min-h-screen grid-cols-[248px_minmax(0,1fr)] max-shell:min-h-0 max-shell:grid-cols-1">
          <Sidebar />
          <main
            id="main"
            className="flex min-h-dvh w-full max-w-[1120px] flex-col justify-self-center px-[clamp(26px,4.2vw,64px)] pt-[52px] pb-10 max-shell:min-h-0 max-shell:px-5 max-shell:pt-7 max-shell:pb-24"
          >
            {children}
          </main>
        </div>
        <GlobalSearch />
      </body>
    </html>
  );
}
