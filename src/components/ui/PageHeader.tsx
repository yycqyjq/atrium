import Breadcrumb, { type Crumb } from "./Breadcrumb";

/** 页面头部：面包屑 + 大标题 + 副标题（可选右侧动作）。全站页面共用。 */
export default function PageHeader({
  crumbs,
  title,
  subtitle,
  extra,
  breadcrumbClassName = "mb-3",
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  breadcrumbClassName?: string;
}) {
  return (
    <header className="pt-4 pb-[26px]">
      <Breadcrumb items={crumbs} className={breadcrumbClassName} />
      <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
        {title}
      </h1>
      {extra ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {subtitle ? <p className="max-w-[34em] text-ink-2">{subtitle}</p> : null}
          {extra}
        </div>
      ) : subtitle ? (
        <p className="max-w-[34em] text-ink-2">{subtitle}</p>
      ) : null}
    </header>
  );
}
