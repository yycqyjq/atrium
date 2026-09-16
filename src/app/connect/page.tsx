import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import ConnectDesk from "@/components/shell/ConnectDesk";
import { readPublicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "设置" };

/** 连接仓库页：配令牌 + 仓库指向（桌面端/本机的「登录」入口） */
export default async function ConnectPage() {
  const cfg = await readPublicConfig();
  const gh = cfg.repos?.github ?? { owner: "", repo: "", branch: "", tokenSet: false };
  const full = await (async () => {
    try {
      const { promises: fs } = await import("node:fs");
      const path = await import("node:path");
      const dir = process.env.ATRIUM_DATA_DIR || path.join(process.cwd(), "data");
      return JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8"));
    } catch {
      return {};
    }
  })();
  const connected = Boolean(gh.tokenSet && gh.owner && gh.repo);

  return (
    <>
      <div className="mb-[72px]">
        <header className="pt-4 pb-[26px]">
          <p className="mb-3 text-[12.5px] tracking-[0.1em] text-ink-3">
            <Link href="/" className="transition-colors duration-150 hover:text-accent">
              中庭
            </Link>
            {" / "}
            <span className="text-ink-2">设置</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            设置
          </h1>
          <p className="max-w-[34em] text-ink-2">
            {connected
              ? "账号与仓库。中庭已连接你的仓库，全部功能可用。"
              : "账号与仓库。填入 GitHub 令牌与仓库信息，中庭即连上你的数据；配置保存在本机，绝不进入仓库。"}
          </p>
        </header>

        <ConnectDesk
          initial={{
            owner: gh.owner ?? "",
            repo: gh.repo ?? "",
            branch: gh.branch || "main",
            tokenSet: Boolean(gh.tokenSet),
            galleryRepo: full?.galleryRepo?.repo ?? "",
            galleryBranch: full?.galleryRepo?.branch ?? "main",
          }}
        />
      </div>
      <Footer />
    </>
  );
}
