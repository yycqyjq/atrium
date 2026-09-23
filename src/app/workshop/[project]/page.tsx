import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Footer from "@/components/shell/Footer";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import Card from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { IconExternal } from "@/components/icons";
import { listDemos } from "@/lib/demos";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project: pid } = await params;
  try {
    const { projects } = await listDemos();
    const project = projects.find((p) => p.id === pid);
    return { title: project ? `${project.name} · 工坊` : "工坊" };
  } catch {
    return { title: "工坊" };
  }
}

/** 项目页：线上站点类型在此介绍并外链；仓库类型回列表筛选 */
export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: pid } = await params;
  const { projects } = await listDemos();
  const project = projects.find((p) => p.id === pid);
  if (!project) notFound();

  if (project.kind === "repo") {
    redirect(`/workshop?p=${encodeURIComponent(project.id)}`);
  }

  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[
            { label: "中庭", href: "/" },
            { label: "工坊", href: "/workshop" },
            { label: project.name },
          ]}
          title={project.name}
          subtitle={project.desc}
        />

        <Card className="bg-raised">
          <p className="mb-5 text-[13px] leading-relaxed text-ink-2">
            这是一个线上站点项目，内容在新窗口打开查看。
          </p>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses("secondary")}
          >
            打开原站
            <IconExternal className="h-3.5 w-3.5" />
          </a>
        </Card>

        <p className="mt-12">
          <BackLink href="/workshop">回到工坊</BackLink>
        </p>
      </div>
      <Footer />
    </>
  );
}
