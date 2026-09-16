import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import PageHeader from "@/components/ui/PageHeader";
import Chip from "@/components/ui/Chip";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { DemoCard, LinkProjectCard } from "@/components/workshop/DemoCard";
import { listDemos } from "@/lib/demos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工坊" };

/** 工坊：接入的组件项目与展品陈列（按项目筛选） */
export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const sp = await searchParams;
  const { projects, items, errors } = await listDemos();
  const active = typeof sp.p === "string" ? sp.p : "";
  const activeProject = projects.find((p) => p.id === active) ?? null;
  const filterId = activeProject?.id ?? "";

  const visibleItems = filterId ? items.filter((item) => item.projectId === filterId) : items;
  const visibleProjects = filterId ? projects.filter((p) => p.id === filterId) : projects;
  const urlProjects = visibleProjects.filter((p) => p.kind === "url");
  const total = visibleItems.length + urlProjects.length;

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
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Chip href="/workshop" active={!activeProject}>
                全部
              </Chip>
              {projects.map((project) => (
                <Chip
                  key={project.id}
                  href={`/workshop?p=${encodeURIComponent(project.id)}`}
                  active={active === project.id}
                >
                  {project.name}
                </Chip>
              ))}
            </div>

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
                sub={
                  activeProject
                    ? "这个项目的仓库里还没有展品，检查仓库的 atrium.json 或目录。"
                    : "往接入的仓库里放组件，或检查展品清单。"
                }
              />
            ) : (
              <>
                <ul className="gap-3 md:columns-2 xl:columns-3">
                  {visibleItems.map((item) => (
                    <li key={`${item.projectId}/${item.id}`} className="mb-3 break-inside-avoid">
                      <DemoCard item={item} />
                    </li>
                  ))}
                  {urlProjects.map((project) => (
                    <li key={project.id} className="mb-3 break-inside-avoid">
                      <LinkProjectCard project={project} />
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[12.5px] tracking-[0.05em] text-ink-3">共 {total} 件展品</p>
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
