import { Suspense } from "react";
import DoorBand from "@/components/home/DoorBand";
import Greeting from "@/components/home/Greeting";
import QuickLinks from "@/components/home/QuickLinks";
import RecentPosts from "@/components/home/RecentPosts";
import RecentShots from "@/components/home/RecentShots";
import Skylight from "@/components/home/Skylight";
import Footer from "@/components/shell/Footer";
import Loading from "@/components/ui/Loading";
import { getRecentPosts } from "@/lib/content";
import { recentShots } from "@/lib/shots";
import { githubProfileUrl, readPublicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

async function RecentPostsBlock() {
  const { items, reason } = await getRecentPosts(4);
  return (
    <RecentPosts
      items={items}
      reason={reason}
      className="motion-safe:animate-rise [animation-delay:240ms]"
    />
  );
}

async function RecentShotsBlock() {
  const { shots } = await recentShots(8).catch(() => ({ shots: [] }));
  return <RecentShots shots={shots} className="motion-safe:animate-rise [animation-delay:280ms]" />;
}

export default async function HomePage() {
  const [githubUrl, cfg] = await Promise.all([githubProfileUrl(), readPublicConfig()]);

  return (
    <>
      <div className="mb-[72px]">
        <header className="flex items-start justify-between gap-12 pt-[18px] pb-12 motion-safe:animate-rise [animation-delay:60ms] max-xs:pb-10">
          <Greeting subtitle={cfg.siteSubtitle} />
          <Skylight className="mt-0 text-motif max-xs:hidden" />
        </header>

        <DoorBand className="motion-safe:animate-rise [animation-delay:150ms]" />

        <Suspense fallback={<Loading className="my-16" />}>
          <RecentPostsBlock />
        </Suspense>

        <Suspense fallback={<Loading className="my-16" />}>
          <RecentShotsBlock />
        </Suspense>

        <QuickLinks
          githubUrl={githubUrl}
          className="motion-safe:animate-rise [animation-delay:320ms]"
        />
      </div>
      <Footer />
    </>
  );
}
