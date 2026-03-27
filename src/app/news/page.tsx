import NewsBackground from "./NewsBackground";
import NewsClient from "./NewsClient";
import { getAllArticles } from "@/lib/articles";

export default async function NewsPage() {
  const newsItems = await getAllArticles();

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
