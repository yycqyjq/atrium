import { listPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atrium.local";
const SITE_TITLE = "中庭";
const SITE_DESC = "个人数字空间：书房 / 画廊 / 工具房 / 陈列廊。内容存放在 GitHub 仓库。";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = SITE_URL.replace(/\/+$/, "");

  let itemsXml = "";
  try {
    const { items } = await listPosts();
    const sorted = [...items]
      .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0))
      .slice(0, 200);
    itemsXml = sorted
      .map((post) => {
        const url = `${base}/study/${post.slug
          .split("/")
          .map((p) => encodeURIComponent(p))
          .join("/")}`;
        const date = post.lastModified
          ? new Date(post.lastModified).toISOString()
          : new Date().toISOString();
        const desc = post.description
          ? `<description>${escapeXml(post.description)}</description>`
          : "";
        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      ${desc}
    </item>`;
      })
      .join("\n");
  } catch {
    itemsXml = "";
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${base}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>zh-CN</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
