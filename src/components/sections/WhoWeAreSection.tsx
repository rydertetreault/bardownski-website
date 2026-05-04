"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, animate, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { CHAMPIONSHIP } from "@/lib/championship";

interface SeasonSummary {
  year: string;
  rosterSize: number;
  captain: string;
  summary: string;
}

interface ChampionshipEntry {
  id: string;
  shortLabel: string;
  title: string;
  detail: string;
  date: string;
  articleId: string;
}

const seasonChampionships: Record<string, ChampionshipEntry[]> = {
  "2025": [
    {
      id: "s4-club-finals",
      shortLabel: "S4 Club Finals",
      title: `${CHAMPIONSHIP.season} ${CHAMPIONSHIP.division} Champions`,
      detail: `Club Finals · ${CHAMPIONSHIP.recordInRun}`,
      date: CHAMPIONSHIP.date,
      articleId: "10",
    },
  ],
};

const seasons: SeasonSummary[] = [
  {
    year: "2020",
    rosterSize: 3,
    captain: "Xavier Laflamme",
    summary:
      "Where it all began. Bardownski was founded and hit the ice for the first time, laying the foundation for everything to come.",
  },
  {
    year: "2021",
    rosterSize: 5,
    captain: "Matt",
    summary:
      "Bardownski kept grinding through another season, developing a core group of players.",
  },
  {
    year: "2022",
    rosterSize: 6,
    captain: "Matt",
    summary:
      "Matt continued leading the club into year three. The roster grew and the team continued to build chemistry, finding its identity as a competitive unit.",
  },
  {
    year: "2023",
    rosterSize: 8,
    captain: "Jimmy",
    summary:
      "Key additions elevated the team's competitiveness. The pieces were finally coming together. Bardownski also debuted the iconic Miami Vice jerseys.",
  },
  {
    year: "2024",
    rosterSize: 10,
    captain: "JRT IV",
    summary:
      "A breakout year. JRT IV became the first goaltender named captain in club history. The roster solidified and the team started climbing the ranks.",
  },
  {
    year: "2025",
    rosterSize: 10,
    captain: "Rob",
    summary:
      "The breakthrough year. After seven years of building, Bardownski captured its first championship.",
  },
];

const MAX_ROSTER = 10;
const CARD_WIDTH = 280;
const CARD_GAP = 20;
const STRIDE = CARD_WIDTH + CARD_GAP;

function offsetForIndex(i: number, containerWidth: number) {
  return containerWidth / 2 - (i * STRIDE + CARD_WIDTH / 2);
}

function closestIndex(xVal: number, containerWidth: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < seasons.length; i++) {
    const cardCenter = xVal + i * STRIDE + CARD_WIDTH / 2;
    const dist = Math.abs(cardCenter - containerWidth / 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export default function WhoWeAreSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [activeIndex, setActiveIndex] = useState(seasons.length - 1);
  const [openChampionship, setOpenChampionship] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  // left/right are the min/max x values (left is the most-negative end)
  const [constraints, setConstraints] = useState({ left: -9999, right: 9999 });

  const snapToIndex = useCallback(
    (i: number) => {
      const cw = containerRef.current?.offsetWidth ?? 0;
      animate(x, offsetForIndex(i, cw), {
        type: "spring",
        stiffness: 280,
        damping: 28,
        mass: 0.8,
      });
      setActiveIndex(i);
    },
    [x]
  );

  // Measure container, set constraints, position at latest season
  useEffect(() => {
    const update = () => {
      const cw = containerRef.current?.offsetWidth;
      if (!cw) return;
      setConstraints({
        right: offsetForIndex(0, cw),
        left: offsetForIndex(seasons.length - 1, cw),
      });
      x.set(offsetForIndex(seasons.length - 1, cw));
    };

    // Let the layout settle first
    const t = setTimeout(update, 20);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [x]);

  // Update active index live as the drag position changes
  useEffect(() => {
    return x.on("change", (latest) => {
      const cw = containerRef.current?.offsetWidth ?? 0;
      const idx = closestIndex(latest, cw);
      setActiveIndex((prev) => (idx !== prev ? idx : prev));
    });
  }, [x]);

  // Close championship slideout when user navigates to a season that doesn't
  // own the currently open championship
  useEffect(() => {
    if (!openChampionship) return;
    const champs = seasonChampionships[seasons[activeIndex]?.year] ?? [];
    if (!champs.some((c) => c.id === openChampionship)) {
      setOpenChampionship(null);
    }
  }, [activeIndex, openChampionship]);

  const handleDragEnd = () => {
    const cw = containerRef.current?.offsetWidth ?? 0;
    snapToIndex(closestIndex(x.get(), cw));
  };

  return (
    <section ref={ref} className="bg-[#1a2744] w-full">
      {/* TOP — Image + Story */}
      <div className="flex flex-col md:flex-row min-h-[500px]">
        {/* LEFT — Image Panel */}
        <motion.div
          className="relative w-full md:w-1/2 min-h-[300px] md:min-h-[500px] overflow-hidden"
          initial={{ x: -60, opacity: 0 }}
          animate={inView ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Image
            src="/images/gallery/screenshots/team%20shot.webp"
            alt="Bardownski Hockey Club — team celebration"
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744]/80 via-[#1a2744]/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-[#1a2744]" />
        </motion.div>

        {/* RIGHT — Text Panel */}
        <motion.div
          className="relative w-full md:w-1/2 bg-[#1a2744] flex flex-col justify-center px-8 py-12 md:px-12 overflow-hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        >
          <span
            className="absolute bottom-0 right-0 text-[80px] sm:text-[160px] md:text-[220px] font-black leading-none select-none pointer-events-none text-white"
            style={{ opacity: 0.05 }}
            aria-hidden="true"
          >
            2020
          </span>

          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-1 h-5 bg-[#cc1533] rounded-sm" />
              <span className="text-[#cc1533] text-xs font-bold uppercase tracking-widest">
                Our Story
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
              Built in Newfoundland.
            </h2>

            <p className="text-white/60 text-base leading-relaxed mb-7">
              Bardownski Hockey Club started in 2020 with three players and a
              simple love for the game. What began as a small group has grown
              into a team that competes at the highest divisions — united by
              Newfoundland pride and a drive to get better every season.
            </p>

            <div className="w-full mb-7 flex flex-col gap-px">
              <div className="h-px bg-[#cc1533]/40" />
              <div className="h-px bg-[#5b9bd5]/25" />
            </div>

            <div className="flex gap-10 mb-8">
              <div>
                <p className="text-[#cc1533] text-2xl font-extrabold tracking-tight drop-shadow-[0_0_8px_rgba(204,21,51,0.5)]">
                  EST. 2020
                </p>
                <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
                  Founded
                </p>
              </div>
              <div>
                <p className="text-[#5b9bd5] text-2xl font-extrabold tracking-tight">
                  6
                </p>
                <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
                  Seasons
                </p>
              </div>
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 border border-white/30 text-white/80 text-sm font-semibold uppercase tracking-wider px-5 py-2.5 rounded hover:border-[#cc1533] hover:text-white transition-colors duration-200"
            >
              View Club History
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Curved Red-Glow Divider */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          height: "72px",
          background: "linear-gradient(to bottom, #1a2744 0%, #0b0f1a 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 72"
          preserveAspectRatio="none"
          style={{ filter: "blur(13px)" }}
        >
          <defs>
            <linearGradient id="waveGlowOuter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff1a3d" stopOpacity="1" />
              <stop offset="50%" stopColor="#ff2846" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff2846" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,10 Q720,64 1440,10"
            fill="none"
            stroke="url(#waveGlowOuter)"
            strokeWidth="22"
          />
        </svg>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 72"
          preserveAspectRatio="none"
          style={{ filter: "blur(1.5px)" }}
        >
          <defs>
            <linearGradient id="waveGlowCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="7%" stopColor="#ff2244" stopOpacity="1" />
              <stop offset="55%" stopColor="#ff2244" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff2244" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,10 Q720,64 1440,10"
            fill="none"
            stroke="url(#waveGlowCore)"
            strokeWidth="3"
          />
        </svg>
      </motion.div>

      {/* BOTTOM — Season History Drag Carousel */}
      <motion.div
        className="pb-14"
        style={{ backgroundColor: "#0b0f1a" }}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
      >
        {/* Section label + link */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="block w-1 h-5 bg-[#cc1533] rounded-sm" />
              <span className="text-[#cc1533] text-xs font-bold uppercase tracking-widest">
                Season History
              </span>
            </div>
            <Link
              href="/stats"
              className="text-sm text-[#cc1533] hover:text-red-300 transition-colors font-medium hidden sm:block"
            >
              Full Stats →
            </Link>
          </div>
        </div>

        {/* Drag track */}
        <div
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ cursor: "grab" }}
        >
          {/* Left + right fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0b0f1a] to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0b0f1a] to-transparent pointer-events-none z-10" />

          <motion.div
            drag="x"
            dragConstraints={constraints}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{ x, display: "flex", alignItems: "center", gap: CARD_GAP }}
            whileDrag={{ cursor: "grabbing" }}
          >
            {seasons.map((season, i) => {
              const isActive = activeIndex === i;
              const isCurrent = season.year === "2025";
              return (
                <motion.div
                  key={season.year}
                  onClick={() => !isActive && snapToIndex(i)}
                  animate={{
                    scale: isActive ? 1 : 0.82,
                    opacity: isActive ? 1 : 0.45,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                  }}
                  style={{
                    flex: `0 0 ${CARD_WIDTH}px`,
                    cursor: isActive ? "grab" : "pointer",
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      height: "340px",
                      backgroundColor: isActive ? "#1e3060" : "#141d30",
                      clipPath:
                        "polygon(0 18px, 100% 0, 100% calc(100% - 18px), 0 100%)",
                      border: isActive
                        ? "1px solid rgba(204,21,51,0.35)"
                        : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: isActive
                        ? "0 8px 40px rgba(204,21,51,0.18)"
                        : "none",
                      transition:
                        "background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                    }}
                  >
                    {/* Year watermark */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        bottom: -18,
                        right: -8,
                        fontSize: "118px",
                        fontWeight: 900,
                        color: "white",
                        opacity: 0.045,
                        lineHeight: 1,
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      {season.year}
                    </span>

                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col p-6 pt-8">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span
                          className="text-3xl font-black font-mono"
                          style={{
                            color: isActive
                              ? "#cc1533"
                              : "rgba(255,255,255,0.35)",
                            transition: "color 0.35s ease",
                          }}
                        >
                          {season.year}
                        </span>
                        {isCurrent && isActive && (
                          <span className="text-[9px] font-bold text-[#cc1533]/70 uppercase tracking-widest">
                            Now
                          </span>
                        )}
                      </div>

                      <div
                        className="h-px mt-3 mb-5"
                        style={{
                          backgroundColor: isActive
                            ? "rgba(204,21,51,0.3)"
                            : "rgba(255,255,255,0.08)",
                          transition: "background-color 0.35s ease",
                        }}
                      />

                      <div className="mb-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
                          Roster
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: isActive
                                  ? "#cc1533"
                                  : "#5b9bd5",
                              }}
                              initial={{ width: 0 }}
                              animate={
                                inView
                                  ? {
                                      width: `${
                                        (season.rosterSize / MAX_ROSTER) * 100
                                      }%`,
                                    }
                                  : { width: 0 }
                              }
                              transition={{
                                duration: 0.9,
                                delay: 0.5 + i * 0.08,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white/50 w-4 text-right tabular-nums">
                            <AnimatedNumber from={0} to={season.rosterSize} />
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">
                          Captain
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{
                            color: isActive
                              ? "white"
                              : "rgba(255,255,255,0.45)",
                            transition: "color 0.35s ease",
                          }}
                        >
                          {season.captain}
                        </p>
                      </div>

                      {seasonChampionships[season.year] && (
                        <div className="mb-4">
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
                            Championships
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {seasonChampionships[season.year].map((champ) => {
                              const isOpen = openChampionship === champ.id;
                              return (
                                <button
                                  key={champ.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isActive) {
                                      snapToIndex(i);
                                      return;
                                    }
                                    setOpenChampionship(isOpen ? null : champ.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors"
                                  style={{
                                    color: isOpen ? "#1a1303" : "#f4d35e",
                                    background: isOpen
                                      ? "linear-gradient(90deg, #d4a017 0%, #f4d35e 50%, #d4a017 100%)"
                                      : "transparent",
                                    border: "1px solid rgba(244,211,94,0.4)",
                                    clipPath:
                                      "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-2.5 h-2.5"
                                  >
                                    <path d="M7 2h10v2h3v3a4 4 0 0 1-4 4h-.35A5.001 5.001 0 0 1 13 14.9V17h2v2H9v-2h2v-2.1A5.001 5.001 0 0 1 7.35 11H7a4 4 0 0 1-4-4V4h3V2zm0 4H5v1a2 2 0 0 0 2 2V6zm10 3a2 2 0 0 0 2-2V6h-2v3zM6 21h12v2H6v-2z" />
                                  </svg>
                                  {champ.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <p
                        className="text-[11px] leading-relaxed mt-auto"
                        style={{
                          color: isActive
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.2)",
                          transition: "color 0.35s ease",
                        }}
                      >
                        {season.summary}
                      </p>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Championship slideout — anchored under the active card */}
        <div
          className="relative flex justify-center pointer-events-none"
          style={{ marginTop: openChampionship ? 0 : 0 }}
        >
          <motion.div
            initial={false}
            animate={{
              height: openChampionship ? "auto" : 0,
              opacity: openChampionship ? 1 : 0,
            }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="overflow-hidden pointer-events-auto"
            style={{ width: CARD_WIDTH }}
          >
            {(() => {
              const activeChamps = seasonChampionships[seasons[activeIndex]?.year] ?? [];
              const champ = activeChamps.find((c) => c.id === openChampionship);
              if (!champ) return null;
              return (
                <div
                  className="relative mt-2"
                  style={{
                    backgroundColor: "#1e3060",
                    border: "1px solid rgba(204,21,51,0.35)",
                    clipPath:
                      "polygon(0 8px, 100% 0, 100% calc(100% - 8px), 0 100%)",
                  }}
                >
                  <button
                    onClick={() => setOpenChampionship(null)}
                    aria-label="Close championship details"
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors text-base leading-none rounded"
                  >
                    ×
                  </button>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="block w-1 h-3 rounded-sm bg-[#cc1533]/70" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cc1533]/80">
                        Club Finals
                      </span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">
                      {champ.title}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">
                      {champ.detail} · {champ.date}
                    </p>
                    <Link
                      href={`/news/${champ.articleId}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#cc1533] hover:text-red-300 transition-colors"
                    >
                      Read Story →
                    </Link>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-5">
          {seasons.map((season, i) => (
            <button
              key={season.year}
              aria-label={`Season ${season.year}`}
              onClick={() => snapToIndex(i)}
              style={{
                width: activeIndex === i ? "24px" : "6px",
                height: "6px",
                borderRadius: "9999px",
                backgroundColor:
                  activeIndex === i ? "#cc1533" : "rgba(255,255,255,0.2)",
                transition: "width 0.3s ease, background-color 0.3s ease",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Mobile link */}
        <div className="mt-6 text-center sm:hidden px-4">
          <Link
            href="/stats"
            className="text-sm text-[#cc1533] hover:text-red-300 transition-colors font-medium"
          >
            Full Stats →
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
