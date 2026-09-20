import { Suspense } from "react";
import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import ToolsList from "@/components/tools/ToolsList";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import SetupGuide from "@/components/ui/SetupGuide";
import ToolsAdd from "@/components/tools/ToolsAdd";
import { listTools } from "@/lib/tools";
import { resolveRepoConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工具房" };

async function ToolsWriteSlot() {
  const { source, groups } = await listTools();
  const cfg = await resolveRepoConfig("github");
  const canWrite = source === "local" || Boolean(cfg.token);
  if (!canWrite) return null;
  return <ToolsAdd categories={groups.map((g) => g.name)} />;
}

async function ToolsFloor() {
  const { groups, count, reason, source } = await listTools();
  const cfg = await resolveRepoConfig("github");
  const canWrite = source === "local" || Boolean(cfg.token);

  const emptyCopy =
    reason === "not-configured"
      ? { title: "还没有接通内容源。", sub: "配置仓库后，这里会亮起来。" }
      : reason === "fetch-failed"
        ? { title: "工具清单暂时读不到。", sub: "检查网络或仓库访问，稍后再试。" }
        : { title: "还没有工具清单。", sub: "把 tools.json 放进仓库的 admin/ 目录，刷新就能看到。" };

  if (reason === "not-configured") {
    return (
      <SetupGuide
        title="工具房还没接通内容源。"
        sub="连好仓库，书签清单就有了数据。"
        steps={[
          "点侧栏底部的头像或 ⚙ 齿轮，打开「设置」页。",
          "填入 GitHub 用户名、仓库名与令牌。",
          "把书签清单放在仓库的 admin/tools.json（格式见下方；也可用 ATRIUM_TOOLS_FILE 自定义路径）。",
          "保存后回工具房：分组清单即刻呈现，之后可在页面上直接增删改。",
        ]}
        examples={[
          {
            label: "tools.json 书签清单格式",
            code: `{
  "categories": ["开发", "AI", "效率"],   // 分组展示顺序（可选）
  "items": [
    {
      "name": "GitHub",
      "url": "https://github.com",
      "description": "代码托管与协作",     // 可选
      "category": "开发"                  // 缺省归入「未分类」
    }
  ]
}`,
          },
        ]}
      />
    );
  }

  if (count === 0) return <EmptyState title={emptyCopy.title} sub={emptyCopy.sub} />;

  return (
    <div data-floor-nav>
      <ToolsList groups={groups} canWrite={canWrite} />
    </div>
  );
}

export default function ToolsPage() {
  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "工具房" }]}
          title="工具房"
          subtitle="书签与常用工具。顺手就能拿到。"
          extra={
            <Suspense fallback={null}>
              <ToolsWriteSlot />
            </Suspense>
          }
        />

        <Suspense fallback={<Loading className="my-24" />}>
          <ToolsFloor />
        </Suspense>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
