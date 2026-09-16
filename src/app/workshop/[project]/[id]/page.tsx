import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/shell/Footer";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import ExhibitStage from "@/components/workshop/ExhibitStage";
import { fetchDemoText, listDemos } from "@/lib/demos";
import type { DemoProject } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; id: string }>;
}): Promise<Metadata> {
  const { project: pid, id } = await params;
  try {
    const { items } = await listDemos();
    const item = items.find((i) => i.projectId === pid && i.id === id);
    return { title: item ? `${item.title} · 工坊` : "工坊" };
  } catch {
    return { title: "工坊" };
  }
}

/** 展品页：取件现场渲染 + 用法 / 属性 / 源码 */
export default async function ExhibitPage({
  params,
}: {
  params: Promise<{ project: string; id: string }>;
}) {
  const { project: pid, id } = await params;
  const { projects, items } = await listDemos();
  const project = projects.find((p) => p.id === pid);
  if (!project || project.kind !== "repo") notFound();
  const item = items.find((i) => i.projectId === pid && i.id === id);
  if (!item) notFound();

  const sourceRel = item.source ?? item.path;
  const source = await fetchDemoText(project, sourceRel);
  const githubUrl = githubBlobUrl(project, sourceRel);
  const moduleUrl = `/api/demo/${item.projectId}/${item.path}`;
  const styleUrls = item.styles.map((s) => `/api/demo/${item.projectId}/${s}`);

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[
            { label: "中庭", href: "/" },
            { label: "工坊", href: "/workshop" },
            { label: item.projectName },
          ]}
          title={item.title}
          subtitle={item.desc}
        />

        <ExhibitStage
          moduleUrl={moduleUrl}
          styles={styleUrls}
          props={item.defaultProps}
          meta={`${item.projectName}${item.group ? ` · ${item.group}` : ""}`}
          source={source}
          githubUrl={githubUrl}
        />

        {item.usage ? (
          <section className="mt-10">
            <h2 className="mb-3 text-[12px] tracking-[0.14em] text-ink-3">用法</h2>
            <pre className="overflow-x-auto rounded-ctl border border-line bg-raised px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-ink-2">
              {item.usage}
            </pre>
          </section>
        ) : null}

        {item.props && item.props.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-3 text-[12px] tracking-[0.14em] text-ink-3">属性</h2>
            <div className="overflow-x-auto rounded-ctl border border-line">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-ink-3">
                    <th className="px-4 py-2.5 font-normal">名称</th>
                    <th className="px-4 py-2.5 font-normal">类型</th>
                    <th className="px-4 py-2.5 font-normal">默认</th>
                    <th className="px-4 py-2.5 font-normal">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {item.props.map((prop) => (
                    <tr key={prop.name} className="border-b border-line text-ink-2 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-accent-ink">{prop.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{prop.type ?? ""}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{prop.default ?? ""}</td>
                      <td className="px-4 py-2.5">{prop.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <p className="mt-12">
          <BackLink href="/workshop">回到工坊</BackLink>
        </p>
      </div>
      <Footer />
    </>
  );
}

function githubBlobUrl(project: DemoProject, path: string): string | null {
  if (!project.repo || !project.repo.includes("/")) return null;
  const [owner, repo] = project.repo.split("/");
  const branch = encodeURIComponent(project.branch || "main");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${owner}/${repo}/blob/${branch}/${encoded}`;
}
