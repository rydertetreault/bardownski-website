import NewsBackground from "./NewsBackground";
import NewsClient from "./NewsClient";

const newsItems = [
  {
    id: "2",
    title: "Bardownski Competes in Div 1 Club Finals",
    summary:
      "Bardownski competed in the highest division of Club Finals (Div 1). After a rocky start, the squad managed to fight their way into the second round but ultimately fell short due to time constraints. A strong showing against top-tier competition.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/Screenshot 2026-03-16 183953.png",
    category: "Results",
  },
  {
    id: "1",
    title: "Welcome to Bardownski",
    summary:
      "The official Bardownski website is now live. Stay tuned for roster updates, match results, and player stats from our Newfoundland-based club.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/t.png",
    category: "Club News",
  },
];

export default function NewsPage() {
  return (
    <div className="min-h-screen">
      <NewsBackground />

      {/* Gallery-style header */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        {/* Powder blue top rule */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(125,211,252,0.4), transparent)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.4em] mb-5"
            style={{ color: "#7dd3fc" }}
          >
            Bardownski · Newfoundland
          </p>
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tight text-white mb-6 leading-none">
            News
          </h1>
          <div
            className="flex items-center justify-center gap-6 text-xs uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span>{newsItems.length} Articles</span>
          </div>
        </div>

        {/* Red bottom accent */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-32"
          style={{ backgroundColor: "#cc1533" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-8">
        <NewsClient items={newsItems} />
      </div>
    </div>
  );
}
