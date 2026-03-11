import Image from "next/image";
import {
  fetchChannelMessages,
  parseAllSeasons,
  computeAllTimeRecords,
  computeSeasonMVPs,
} from "@/lib/discord";
import RecordsClient from "./RecordsClient";

export default async function RecordsPage() {
  const messages = await fetchChannelMessages();
  const seasons = parseAllSeasons(messages);
  const records = computeAllTimeRecords(seasons);
  const mvps = computeSeasonMVPs(seasons);

  return (
    <div className="min-h-screen">
      {/* Stadium hero header */}
      <div className="relative pt-16">
        <div className="relative h-64 md:h-80 overflow-hidden">
          {/* Stadium background */}
          <Image
            src="/images/logo/BD - stadium.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-navy-dark/80 to-background" />

          {/* Centered logo crest */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-28 h-28 md:w-36 md:h-36 opacity-15">
              <Image
                src="/images/logo/BD - logo.png"
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Title content */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-[0.2em] text-center">
              Records
            </h1>
            <div className="w-24 h-1 bg-red mt-3 rounded-full" />
            <p className="text-muted mt-3 text-sm uppercase tracking-widest">
              All-time Bardownski records & awards
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <RecordsClient records={records} mvps={mvps} />
        )}
      </div>
    </div>
  );
}
