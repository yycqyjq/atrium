import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import WorkshopList from "@/components/workshop/WorkshopList";
import { listDemos, type DemoItem } from "@/lib/demos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工坊" };

/** 工坊：接入的组件项目与展品陈列（分区 + 即时搜索 + 楼层目录） */
export default async function WorkshopPage() {
  const { projects, items, errors } = await listDemos();
  const multi = projects.length > 1;

  const sections: { key: string; title: string; items: DemoItem[] }[] = [];
  for (const item of items) {
    const group = item.group ?? "展品";
    const key = `${item.projectId}:${group}`;
    let section = sections.find((s) => s.key === key);
    if (!section) {
      section = { key, title: multi ? `${item.projectName} · ${group}` : group, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  }
  const urlProjects = projects.filter((p) => p.kind === "url");
  const total = items.length + urlProjects.length;

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "工坊" }]}
          title="工坊"
          subtitle="自留的组件与用法。从仓库取件，现场装配。"
        />

        {projects.length === 0 ? (
          <>
            <EmptyState
              title="工坊还没进料。"
              sub="到设置里接入你的组件仓库，这里就会摆出来。"
            />
            <p className="text-center">
              <ButtonLink href="/connect" variant="secondary">
                去设置
              </ButtonLink>
            </p>
          </>
        ) : (
          <>
            {errors.length > 0 ? (
              <div className="mb-5 space-y-2">
                {errors.map((error) => (
                  <Alert key={error} tone="error" size="sm">
                    {error}
                  </Alert>
                ))}
              </div>
            ) : null}

            {total === 0 ? (
              <EmptyState
                variant="search"
                title="还没有可陈列的展品。"
                sub="往接入的仓库里放组件，或检查展品清单。"
              />
            ) : (
              <WorkshopList sections={sections} urlProjects={urlProjects} />
            )}
          </>
        )}
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
