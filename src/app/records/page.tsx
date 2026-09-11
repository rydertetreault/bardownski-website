import type { Metadata } from "next";
import RecordsRedesign from "./redesign/RecordsRedesign";

export const metadata: Metadata = {
  title: "Club Records | Bardownski",
  description: "Team records, searchable player records, plus/minus leaders, championships and season-by-season achievements.",
};

export default function RecordsPage() {
  return <RecordsRedesign />;
}
