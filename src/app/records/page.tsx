import type { Metadata } from "next";
import RecordsRedesign from "./redesign/RecordsRedesign";
import { loadRecordsData } from "./redesign/load";

export const metadata: Metadata = {
  title: "Club Records | Bardownski",
  description: "Individual and team records from every logged game, updated as games are played, plus championships and season-by-season achievements.",
};

// Records follow every logged game; refresh on the same cadence as the tracker.
export const revalidate = 300;

export default async function RecordsPage() {
  // Only per-game summaries and record entries reach the client, never the raw logs.
  return <RecordsRedesign data={await loadRecordsData()} />;
}
