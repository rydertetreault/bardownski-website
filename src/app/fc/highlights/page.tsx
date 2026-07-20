import type { Metadata } from "next";
import { FcPageShell, FcPageHeader } from "@/components/fc/FcUI";
import HighlightsClient from "./HighlightsClient";

export const metadata: Metadata = {
  title: "Highlights | Bardownski FC",
  description: "Watch Bardownski FC highlight reels and best moments. EA FC 26 Pro Clubs.",
};

export interface FcHighlightVideo {
  id: string;
  title: string;
  description: string;
  src: string;
  poster: string;
  duration: string;
}

const videos: FcHighlightVideo[] = [
  {
    id: "reel-1",
    title: "Bardownski FC — Highlight Reel Vol. 1",
    description: "The best goals, saves and moments from the club's opening stretch.",
    src: "/fc/videos/fc-highlight-1.mp4",
    poster: "/fc/images/fc-highlight-1-poster.webp",
    duration: "1:00",
  },
];

export default function FcHighlightsPage() {
  return (
    <FcPageShell>
      <FcPageHeader
        label="Club Media"
        title="THE"
        titleAccent="HIGHLIGHTS"
        right={
          <span className="text-xs text-white/40 uppercase tracking-[0.2em] self-start sm:self-auto">
            {videos.length} Reel{videos.length === 1 ? "" : "s"}
          </span>
        }
      />
      <HighlightsClient videos={videos} />
    </FcPageShell>
  );
}
