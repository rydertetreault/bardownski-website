import Image from "next/image";
import { fetchChannelMessages, parseAllSeasons, computePlayerOfCycle } from "@/lib/discord";
import StatsClient from "./StatsClient";
import PlayerOfCycleSection from "@/components/sections/PlayerOfCycleSection";

export default async function StatsPage() {
  const messages = await fetchChannelMessages();
  const seasons = parseAllSeasons(messages);
  const cyclePlayer = computePlayerOfCycle(messages);

  return (
    <div className="min-h-screen relative">
      {/* Analytical grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
        {/* Minor gridlines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        {/* Major gridlines every 3rd cell */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "90px 90px",
          }}
        />
        {/* Soft white glow at top — chart area highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Scoreboard-style header */}
      <div className="relative pt-16">
        <div className="relative h-56 md:h-64 overflow-hidden">
          {/* Rink-line subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.04]">
            {/* Center red line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2 bg-red" />
            {/* Blue lines */}
            <div className="absolute top-0 bottom-0 left-1/3 -translate-x-1/2 w-1 bg-blue-400" />
            <div className="absolute top-0 bottom-0 left-2/3 -translate-x-1/2 w-1 bg-blue-400" />
            {/* Faceoff circles */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red rounded-full" />
            <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red rounded-full" />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />

          {/* Logo */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-16 opacity-10">
            <Image
              src="/images/logo/BD - logo.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Title */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-px w-12 bg-red/50" />
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.15em]">
                Player Stats
              </h1>
              <div className="h-px w-12 bg-red/50" />
            </div>
            <p className="text-muted text-sm uppercase tracking-widest">
              Season statistics and leaderboards
            </p>
          </div>
        </div>
      </div>

      {cyclePlayer && <PlayerOfCycleSection player={cyclePlayer} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {seasons.length === 0 ? (
          <div className="text-center py-24 bg-navy border border-border rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-xl opacity-20">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted text-lg">Stats coming soon.</p>
            <p className="text-muted/50 text-sm mt-2">
              Player stats will be available soon.
            </p>
          </div>
        ) : (
          <StatsClient seasons={seasons} />
        )}
      </div>
    </div>
  );
}
