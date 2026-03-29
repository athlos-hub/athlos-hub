import { getServerSession } from "next-auth";

import { getHomePageData } from "@/actions/home";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { LiveGamesSection } from "@/components/home/LiveGamesSection";
import { UpcomingGamesSection } from "@/components/home/UpcomingGamesSection";
import { SocialFeedSection } from "@/components/home/SocialFeedSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);

  const homeData = await getHomePageData();

  return (
    <main className="w-full min-w-0">
      <HeroSection isAuthenticated={isAuthenticated} />
      <StatsBar />
      <LiveGamesSection initialGames={homeData.liveGames} />
      <HowItWorksSection />
      <UpcomingGamesSection initialGames={homeData.upcomingGames} />
      <SocialFeedSection
        isAuthenticated={isAuthenticated}
        initialPosts={homeData.feedPosts}
      />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
    </main>
  );
}
