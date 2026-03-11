import Image from "next/image";
import GalleryClient from "./GalleryClient";

// General gallery photos
export interface GalleryItem {
  src: string;
  alt: string;
}

const galleryItems: GalleryItem[] = [
  { src: "/images/logo/BD - stadium.png", alt: "Bardownski Arena" },
  { src: "/images/logo/BD - logos + branding.png", alt: "Logos and branding" },
  { src: "/images/logo/BD - logo.png", alt: "Primary logo" },
  { src: "/images/logo/IMG_3371.png", alt: "Newfoundland mascot logo" },
  { src: "/images/players/BD - home skt.png", alt: "Home jersey - Skater" },
  { src: "/images/players/BD - home goalie.png", alt: "Home jersey - Goalie" },
  { src: "/images/players/BD - away skt.png", alt: "Away jersey - Skater" },
  { src: "/images/players/BD - away goalie.png", alt: "Away jersey - Goalie" },
  { src: "/images/players/BD - alt skt.png", alt: "Alternate jersey - Skater" },
  { src: "/images/players/BD - alt goalie.png", alt: "Alternate jersey - Goalie" },
];

// Jersey wall — current set + past jerseys by season
export interface JerseyCard {
  year: string;
  name: string;
  description: string;
  video: string;
  current?: boolean;
}

const jerseys: JerseyCard[] = [
  // Current set
  {
    year: "2025",
    name: "Home Navy",
    description: "Navy base with red striping and the iconic B crest.",
    video: "/videos/BD - Home.mp4",
    current: true,
  },
  {
    year: "2025",
    name: "Away White",
    description: "White body with navy and red accents.",
    video: "/videos/BD - Away.mp4",
    current: true,
  },
  {
    year: "2025",
    name: "Alternate Red",
    description: "All red with the eagle crest and stars.",
    video: "/videos/BD - Alt.mp4",
    current: true,
  },
  // Past jerseys — update with real videos/images when available
  {
    year: "2024",
    name: "Home Navy",
    description: "Placeholder — update with the actual jersey.",
    video: "/videos/BD - Home.mp4",
  },
  {
    year: "2023",
    name: "Home Navy",
    description: "Placeholder — update with the actual jersey.",
    video: "/videos/BD - Home.mp4",
  },
  {
    year: "2022",
    name: "Home Navy",
    description: "Placeholder — update with the actual jersey.",
    video: "/videos/BD - Home.mp4",
  },
  {
    year: "2021",
    name: "Home Navy",
    description: "Placeholder — update with the actual jersey.",
    video: "/videos/BD - Home.mp4",
  },
  {
    year: "2020",
    name: "Home Navy",
    description: "Placeholder — update with the actual jersey.",
    video: "/videos/BD - Home.mp4",
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative pt-16">
        <div className="relative h-56 md:h-64 overflow-hidden bg-navy-dark">
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-16 opacity-10">
            <Image
              src="/images/logo/BD - logo.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-px w-12 bg-red/50" />
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.15em]">
                Gallery
              </h1>
              <div className="h-px w-12 bg-red/50" />
            </div>
            <p className="text-muted text-sm uppercase tracking-widest">
              Jerseys, screenshots & branding
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GalleryClient photos={galleryItems} jerseys={jerseys} />
      </div>
    </div>
  );
}
