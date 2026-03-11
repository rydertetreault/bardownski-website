import HeroSection from "@/components/sections/HeroSection";
import JerseyShowcase from "@/components/sections/JerseyShowcase";
import StatsPreviewSection from "@/components/sections/StatsPreviewSection";
import ClubRecords from "@/components/sections/ClubRecords";
import HighlightsSection from "@/components/sections/HighlightsSection";
import SeasonsOverview from "@/components/sections/SeasonsOverview";
import NewsSection from "@/components/sections/NewsSection";
import {
  fetchChannelMessages,
  parseAllSeasons,
  computeAllTimeRecords,
} from "@/lib/discord";

export default async function Home() {
  const messages = await fetchChannelMessages();
  const seasons = parseAllSeasons(messages);
  const records = computeAllTimeRecords(seasons);

  return (
    <>
      <HeroSection />
      <JerseyShowcase />
      <StatsPreviewSection />
      <ClubRecords records={records} />
      <HighlightsSection />
      <SeasonsOverview />
      <NewsSection />
    </>
  );
}
