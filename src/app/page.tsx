import HeroSection from "@/components/sections/HeroSection";
import StatsTicker from "@/components/sections/StatsTicker";
import WhoWeAreSection from "@/components/sections/WhoWeAreSection";
import JerseyShowcase from "@/components/sections/JerseyShowcase";
import StatsPreviewSection from "@/components/sections/StatsPreviewSection";
import PlayerOfCycleBadge from "@/components/sections/PlayerOfCycleBadge";
import HighlightsSection from "@/components/sections/HighlightsSection";
import NewsSection from "@/components/sections/NewsSection";
import { fetchChannelMessages, computePlayerOfCycle } from "@/lib/discord";

export default async function Home() {
  const messages = await fetchChannelMessages();
  const cyclePlayer = computePlayerOfCycle(messages);

  return (
    <>
      {cyclePlayer && <PlayerOfCycleBadge player={cyclePlayer} />}
      <HeroSection />
      <StatsTicker messages={messages} />
      <NewsSection />
      <WhoWeAreSection />
      <JerseyShowcase />
      <StatsPreviewSection messages={messages} />
      <HighlightsSection />
    </>
  );
}
