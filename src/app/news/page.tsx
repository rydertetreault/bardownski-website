import Image from "next/image";
import type { NewsItem } from "@/types";

const newsItems: NewsItem[] = [
  {
    id: "2",
    title: "Bardownski Competes in Div 1 Club Finals",
    summary:
      "Bardownski competed in the highest division of Club Finals (Div 1). After a rocky start, the squad managed to fight their way into the second round but ultimately fell short due to time constraints. A strong showing against top-tier competition.",
    date: "2026-03-09",
    image: "/images/logo/BD - stadium.png",
  },
  {
    id: "1",
    title: "Welcome to Bardownski",
    summary:
      "The official Bardownski website is now live. Stay tuned for roster updates, match results, and player stats from our Newfoundland-based club.",
    date: "2026-03-09",
    image: "/images/logo/BD - stadium.png",
  },
];

export default function NewsPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-xl overflow-hidden mb-12 bg-navy border border-border">
          <div className="relative h-48">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 opacity-10">
              <Image
                src="/images/logo/IMG_3371.png"
                alt=""
                fill
                className="object-cover object-[center_30%] scale-150"
              />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center px-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-wider mb-1">News</h1>
              <p className="text-muted">Latest from the club.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map((item) => (
            <article
              key={item.id}
              className="group bg-navy border border-border rounded-xl overflow-hidden hover:border-red/50 transition-all duration-300"
            >
              <div className="relative h-52 overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-navy-light" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" />
              </div>
              <div className="p-6">
                <p className="text-xs text-red font-medium uppercase tracking-wider mb-2">{item.date}</p>
                <h2 className="text-lg font-bold mb-2 group-hover:text-red transition-colors">{item.title}</h2>
                <p className="text-sm text-muted">{item.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
