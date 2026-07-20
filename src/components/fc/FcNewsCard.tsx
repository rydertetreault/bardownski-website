import Link from "next/link";
import Image from "next/image";
import type { FcNewsItem } from "@/lib/fcstats";

export default function FcNewsCard({ item }: { item: FcNewsItem }) {
  return (
    <Link
      href={`/fc/news/${item.id}`}
      className="group rounded-xl overflow-hidden flex flex-col transition-transform hover:scale-[1.01]"
      style={{
        backgroundColor: "var(--fc-card)",
        border: "1px solid var(--fc-border)",
      }}
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 40%, rgba(27,29,33,0.9) 100%)",
          }}
        />
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{ backgroundColor: "var(--fc-gold)", color: "#141414" }}
        >
          {item.category}
        </span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{item.date}</span>
        <h3 className="font-bold text-white leading-snug group-hover:underline decoration-[var(--fc-gold)] underline-offset-4">
          {item.title}
        </h3>
        <p className="text-sm text-white/45 line-clamp-2">{item.excerpt}</p>
      </div>
    </Link>
  );
}
