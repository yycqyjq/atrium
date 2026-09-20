import { Suspense } from "react";
import type { Metadata } from "next";
import Footer from "@/components/shell/Footer";
import FloorNav from "@/components/shell/FloorNav";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import SetupGuide from "@/components/ui/SetupGuide";
import { ButtonLink } from "@/components/ui/Button";
import WorkshopList from "@/components/workshop/WorkshopList";
import { listDemos, type DemoItem } from "@/lib/demos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "工坊" };

/** 工坊：接入的组件项目与展品陈列（分区 + 即时搜索 + 楼层目录） */
async function WorkshopFloor() {
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

  if (projects.length === 0) {
    return (
      <SetupGuide
        title="工坊还没进料。"
        sub="接入你的组件仓库，展品会从仓库取件、现场装配。"
        steps={[
          "点侧栏底部的头像或 ⚙ 齿轮，打开「设置」页。",
          "找到「组件项目」分区，添加一条：类型选「仓库」，填 owner/仓库名（如 your-name/bricks），分支 main。",
          "仓库根目录放一份 atrium.json 展品清单（下方有格式示例；砖瓦 bricks 模板仓库自带）。",
          "保存后进工坊：展品按清单自动收编，真实运行在页面上。",
        ]}
        examples={[
          {
            label: "atrium.json 展品清单格式",
            code: `{
  "exhibits": [
    {
      "id": "toast",                  // 必填：字母数字开头，与构建产物同名
      "title": "Toast 提示",
      "desc": "轻量反馈提示，自动排队",
      "group": "反馈",                 // 分区展示（可选）
      "entry": "dist/exhibits/toast.js",   // 必填：ESM 产物路径
      "styles": ["dist/exhibits/toast.css"],
      "usage": "mount(el, { duration: 2800 })",
      "props": [
        { "name": "duration", "type": "number", "default": "2800", "note": "停留毫秒数" }
      ]
    }
  ]
}`,
          },
        ]}
      />
    );
  }

  return (
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
  );
}

export default function WorkshopPage() {
  return (
    <>
      <div className="mb-[72px]">
        <PageHeader
          crumbs={[{ label: "中庭", href: "/" }, { label: "工坊" }]}
          title="工坊"
          subtitle="自留的组件与用法。从仓库取件，现场装配。"
        />

        <Suspense fallback={<Loading className="my-24" />}>
          <WorkshopFloor />
        </Suspense>
      </div>
      <FloorNav />
      <Footer />
    </>
  );
}
