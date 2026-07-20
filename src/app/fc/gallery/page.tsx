import type { Metadata } from "next";
import { FcPageShell, FcPageHeader } from "@/components/fc/FcUI";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Gallery | Bardownski FC",
  description: "Bardownski FC photo gallery — moments from the pitch. EA FC 26 Pro Clubs.",
};

export interface FcGalleryPhoto {
  src: string;
  alt: string;
}

const photos: FcGalleryPhoto[] = Array.from({ length: 29 }, (_, i) => ({
  src: `/fc/images/gallery/fc-still-${String(i + 1).padStart(2, "0")}.webp`,
  alt: `Bardownski FC — moment ${i + 1}`,
}));

export default function FcGalleryPage() {
  return (
    <FcPageShell>
      <FcPageHeader
        label="Club Media"
        title="THE"
        titleAccent="GALLERY"
        right={
          <span className="text-xs text-white/40 uppercase tracking-[0.2em] self-start sm:self-auto">
            {photos.length} Photos
          </span>
        }
      />
      <GalleryClient photos={photos} />
    </FcPageShell>
  );
}
