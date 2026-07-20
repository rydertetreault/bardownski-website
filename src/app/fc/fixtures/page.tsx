import type { Metadata } from "next";
import { fetchFcStatsData } from "@/lib/fcstats";
import {
  FcPageShell,
  FcPageHeader,
  FcDataUnavailable,
  FcFormGuide,
} from "@/components/fc/FcUI";
import { computeFcForm } from "@/lib/fcstats";
import FixturesClient from "./FixturesClient";

export const metadata: Metadata = {
  title: "Fixtures & Results | Bardownski FC",
  description:
    "Every Bardownski FC match — league, playoff and friendly results with full player ratings.",
};

export default async function FcFixturesPage() {
  const data = await fetchFcStatsData();

  return (
    <FcPageShell>
      <FcPageHeader
        label="EA FC 26 · Pro Clubs"
        title="FIXTURES &"
        titleAccent="RESULTS"
        right={
          data ? (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Form
              </span>
              <FcFormGuide form={computeFcForm(data.matches, 5)} />
            </div>
          ) : undefined
        }
      />
      {!data ? <FcDataUnavailable /> : <FixturesClient matches={data.matches} />}
    </FcPageShell>
  );
}
