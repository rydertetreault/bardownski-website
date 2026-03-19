import Image from "next/image";
import {
  fetchChannelMessages,
  parseAllSeasons,
  computeAllTimeRecords,
  computeSeasonMVPs,
} from "@/lib/discord";
import type { SeasonData } from "@/lib/discord";
import { fetchChelstatsData, chelstatsToSeasonData } from "@/lib/chelstats";
import RecordsClient from "./RecordsClient";
import RecordsBackground from "./RecordsBackground";


export default async function RecordsPage() {
  const [messages, chelstats] = await Promise.all([
    fetchChannelMessages(),
    fetchChelstatsData(),
  ]);

  // Discord seasons (2023, 2024 — 2025 comes from chelstats)
  const discordSeasons = parseAllSeasons(messages).filter(
    (s) => s.season !== "2025"
  );

  // Chelstats 2025 season (live from EA)
  const chelstatsSeason = chelstats
    ? chelstatsToSeasonData(chelstats.members)
    : null;

  // Combine: 2025 first, then historical
  const seasons: SeasonData[] = [
    ...(chelstatsSeason ? [chelstatsSeason] : []),
    ...discordSeasons,
  ];

  const records = computeAllTimeRecords(seasons);
  const mvps = computeSeasonMVPs(seasons);

  return (
    <div className="min-h-screen relative">
      <RecordsBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Page title */}
        <div className="mb-12">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-[#cc1533]/50 via-[#cc1533]/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-4">
            <span className="block w-1 h-8 bg-[#cc1533] rounded-sm" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.15em]">
                Records
              </h1>
              <p className="text-muted text-xs uppercase tracking-widest mt-1">
                All-time records & awards
              </p>
            </div>
          </div>
        </div>
        {records.length === 0 && mvps.length === 0 ? (
          <div className="text-center py-24 bg-navy border border-border rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-xl opacity-20">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted text-lg">Records coming soon.</p>
            <p className="text-muted/50 text-sm mt-2">
              Records will be synced from Discord.
            </p>
          </div>
        ) : (
          <RecordsClient
            records={records}
            mvps={mvps}
            seasons={seasons}
          />
        )}
      </div>
    </div>
  );
}
