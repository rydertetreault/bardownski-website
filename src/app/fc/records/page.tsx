import type { Metadata } from "next";
import { fetchFcStatsData, computeFcRecords } from "@/lib/fcstats";
import {
  FcPageShell,
  FcPageHeader,
  FcSectionHeading,
  FcDataUnavailable,
} from "@/components/fc/FcUI";
import type { FcRecordEntry } from "@/lib/fcstats";

export const metadata: Metadata = {
  title: "Records | Bardownski FC",
  description:
    "Bardownski FC club and player records — computed live from EA FC 26 Pro Clubs data.",
};

function RecordCard({ record, featured }: { record: FcRecordEntry; featured?: boolean }) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-1 relative overflow-hidden"
      style={{
        backgroundColor: "var(--fc-card)",
        border: featured ? "1px solid rgba(204,21,51,0.4)" : "1px solid var(--fc-border)",
      }}
    >
      {featured && (
        <div
          className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle at top right, #cc1533 0%, transparent 70%)",
          }}
        />
      )}
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
        {record.label}
      </span>
      <span
        className="text-4xl font-black tracking-tight tabular-nums"
        style={{ color: "var(--fc-gold-light)" }}
      >
        {record.value}
      </span>
      <span className="font-bold text-white">{record.holder}</span>
      {record.detail && <span className="text-xs text-white/40">{record.detail}</span>}
    </div>
  );
}

export default async function FcRecordsPage() {
  const data = await fetchFcStatsData();
  const records = data ? computeFcRecords(data) : null;

  return (
    <FcPageShell>
      <FcPageHeader label="EA FC 26 · Pro Clubs" title="CLUB" titleAccent="RECORDS" />
      {!records ? (
        <FcDataUnavailable />
      ) : (
        <>
          <section className="mb-14">
            <FcSectionHeading>Club Records</FcSectionHeading>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.club.map((r, i) => (
                <RecordCard key={r.label} record={r} featured={i === 0} />
              ))}
            </div>
          </section>

          <section>
            <FcSectionHeading>Player Records</FcSectionHeading>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.player.map((r, i) => (
                <RecordCard key={r.label} record={r} featured={i === 0} />
              ))}
            </div>
          </section>

          <p className="text-[11px] text-white/25 mt-10 text-center uppercase tracking-wider">
            Records computed live from EA Pro Clubs data · single-game records limited to the
            tracked match window
          </p>
        </>
      )}
    </FcPageShell>
  );
}
