#!/usr/bin/env node
/**
 * 中庭冒烟巡检：一键把关键路径全跑一遍。
 * 用法：node scripts/smoke.mjs [baseURL]     （默认 http://localhost:3203）
 * 全过退出码 0；任一失败退出码 1。
 */
const BASE = (process.argv[2] || "http://localhost:3203").replace(/\/+$/, "");
const TIMEOUT = 25000;

const pages = [
  { path: "/", markers: ["中庭", "书房", "工坊"] },
  { path: "/study", markers: ["书房"] },
  { path: "/gallery", markers: ["画廊"] },
  { path: "/tools", markers: ["工具房"] },
  { path: "/workshop", markers: ["工坊"] },
  { path: "/atelier", markers: ["陈列廊"] },
  { path: "/connect", markers: ["设置"] },
  { path: "/study/write", markers: ["写作台"] },
  { path: "/not-a-real-page", markers: [], expectStatus: [404] },
];

const apis = [
  { path: "/api/config", expect: (d) => d && typeof d === "object" && "repos" in d },
  { path: "/api/providers", expect: (d) => d && typeof d === "object" },
  { path: "/api/posts", expect: (d) => d && Array.isArray(d.items) },
  { path: "/api/search-index", expect: (d) => d && Array.isArray(d.posts) && Array.isArray(d.exhibits) },
  { path: "/api/demo/bricks/dist/exhibits/toast.js?fresh=1", expect: "text/javascript", text: true },
  { path: "/rss.xml", expect: () => true, text: true },
  { path: "/sitemap.xml", expect: () => true, text: true },
];

let failed = 0;
const t0 = Date.now();

async function fetchText(path) {
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(TIMEOUT), headers: { "User-Agent": "atrium-smoke" } });
  const text = await res.text();
  return { status: res.status, text, type: res.headers.get("content-type") ?? "" };
}

function ok(line) { console.log("  ✔ " + line); }
function bad(line) { failed += 1; console.log("  ✘ " + line); }

console.log(`中庭冒烟巡检 · ${BASE}\n`);

console.log("页面：");
for (const page of pages) {
  try {
    const { status, text } = await fetchText(page.path);
    const expectStatus = page.expectStatus ?? [200];
    if (!expectStatus.includes(status)) { bad(`${page.path} → HTTP ${status}（期望 ${expectStatus.join("/")}）`); continue; }
    const missing = page.markers.filter((m) => !text.includes(m));
    if (missing.length) { bad(`${page.path} → 缺少标记 ${missing.join(", ")}`); continue; }
    ok(`${page.path} → ${status}`);
  } catch (err) {
    bad(`${page.path} → ${err.message}`);
  }
}

console.log("接口：");
for (const api of apis) {
  try {
    const { status, text, type } = await fetchText(api.path);
    if (status !== 200) { bad(`${api.path} → HTTP ${status}`); continue; }
    if (api.text) {
      if (typeof api.expect === "string" && !type.includes(api.expect)) { bad(`${api.path} → content-type ${type}`); continue; }
      ok(`${api.path} → 200`);
      continue;
    }
    const data = JSON.parse(text);
    if (api.expect(data)) ok(`${api.path} → 200`);
    else bad(`${api.path} → 响应结构不符`);
  } catch (err) {
    // 展品通道未配置时（无组件项目）给出提示但不计失败
    if (api.path.startsWith("/api/demo/") && /40[34]/.test(err.message)) {
      console.log("  · " + api.path + " → 跳过（未配置组件项目）");
      continue;
    }
    bad(`${api.path} → ${err.message}`);
  }
}

const dur = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${failed === 0 ? "全部通过" : failed + " 项失败"} · ${dur}s`);
process.exit(failed === 0 ? 0 : 1);
