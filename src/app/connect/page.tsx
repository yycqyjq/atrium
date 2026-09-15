import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shell/Footer";
import ConnectDesk from "@/components/shell/ConnectDesk";
import { readPublicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "连接仓库" };

/** 连接仓库页：配令牌 + 仓库指向（桌面端/本机的「登录」入口） */
export default async function ConnectPage() {
  const cfg = await readPublicConfig();
  const gh = cfg.repos?.github ?? { owner: "", repo: "", branch: "", tokenSet: false };
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
            <span className="text-ink-2">连接仓库</span>
          </p>
          <h1 className="mb-3 font-serif text-[34px] font-semibold leading-tight tracking-[0.03em] max-xs:text-[28px]">
            连接仓库
          </h1>
          <p className="max-w-[34em] text-ink-2">
            {connected
              ? "中庭已连接你的仓库，全部功能可用。"
              : "填入 GitHub 令牌与仓库信息，中庭即连上你的数据。配置保存在本机，绝不进入仓库。"}
          </p>
        </header>

        <ConnectDesk
          initial={{
            owner: gh.owner ?? "",
            repo: gh.repo ?? "",
            branch: gh.branch || "main",
            tokenSet: Boolean(gh.tokenSet),
          }}
        />
      </div>
      <Footer />
    </>
  );
}
