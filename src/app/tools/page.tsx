import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import ToolsList from "@/components/tools/ToolsList";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ToolsAdd from "@/components/tools/ToolsAdd";
import { listTools } from "@/lib/tools";
import { resolveRepoConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工具房" };

export default async function ToolsPage() {
  const { groups, count, reason, source } = await listTools();
  const cfg = await resolveRepoConfig("github");
  const canWrite = source === "local" || Boolean(cfg.token);
  const categories = groups.map((g) => g.name);

  const emptyCopy =
    reason === "not-configured"
      ? { title: "还没有接通内容源。", sub: "配置仓库后，这里会亮起来。" }
      : reason === "fetch-failed"
        ? { title: "工具清单暂时读不到。", sub: "检查网络或仓库访问，稍后再试。" }
        : { title: "还没有工具清单。", sub: "把 tools.json 放进仓库的 admin/ 目录，刷新就能看到。" };

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "工具房" }]}
          title="工具房"
          subtitle="书签与常用工具。顺手就能拿到。"
          extra={canWrite ? <ToolsAdd categories={categories} /> : null}
        />

        {count === 0 ? (
          <EmptyState title={emptyCopy.title} sub={emptyCopy.sub} />
        ) : (
          <div data-floor-nav>
            <ToolsList groups={groups} canWrite={canWrite} />
          </div>
        )}
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
