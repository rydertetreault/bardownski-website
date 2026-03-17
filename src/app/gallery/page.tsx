import GalleryClient from "./GalleryClient";
import GalleryBackground from "./GalleryBackground";

export interface GalleryPhoto {
  src: string;
  alt: string;
}

export interface GalleryVideo {
  src: string;
  label: string;
}

const photos: GalleryPhoto[] = [
  { src: "/images/gallery/screenshots/team.png", alt: "Team" },
  { src: "/images/gallery/screenshots/IMG_3288.png", alt: "Bardownski" },
  { src: "/images/gallery/screenshots/IMG_3294.jpg", alt: "Bardownski" },
  { src: "/images/gallery/screenshots/IMG_3428.png", alt: "Bardownski" },
  { src: "/images/gallery/screenshots/t.png", alt: "Bardownski" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183502.png", alt: "Screenshot" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183710.png", alt: "Screenshot" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183904.png", alt: "Screenshot" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183953.png", alt: "Screenshot" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 184232.png", alt: "Screenshot" },
];

const videos: GalleryVideo[] = [
  { src: "/videos/Dylan1.mp4", label: "Dylan – Final Cut" },
  { src: "/videos/GottaBe - Trap Edition.mov", label: "Gotta Be – Trap Edition" },
  { src: "/videos/Slobby Robby 2026.mov", label: "Slobby Robby 2026" },
  { src: "/videos/Ryder1.mp4", label: "Ryder – Clip 1" },
  { src: "/videos/Ryder2.mp4", label: "Ryder – Clip 2" },
  { src: "/videos/Kaden1.mp4", label: "Kaden – Clip 1" },
  { src: "/videos/BD - Home.mp4", label: "Home Jersey" },
  { src: "/videos/BD - Away.mp4", label: "Away Jersey" },
  { src: "/videos/BD - Alt.mp4", label: "Alternate Jersey" },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      <GalleryBackground />

      {/* Header */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        {/* Powder blue top rule */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, rgba(125,211,252,0.4), transparent)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.4em] mb-5"
            style={{ color: "#7dd3fc" }}
          >
            Bardownski · Newfoundland
          </p>
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tight text-white mb-6 leading-none">
            Gallery
          </h1>
          <div className="flex items-center justify-center gap-6 text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>{photos.length} Photos</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#cc1533" }} />
            <span>{videos.length} Videos</span>
          </div>
        </div>

        {/* Red bottom accent */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-32"
          style={{ backgroundColor: "#cc1533" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-8">
        <GalleryClient photos={photos} videos={videos} />
      </div>
    </div>
  );
}
