"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FadeUp } from "@/components/ui/Animate";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { AllTimeRecord } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

function RecordBannerSmall({
  record,
  index,
}: {
  record: AllTimeRecord;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className="group relative"
    >
      {/* Hanging line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-border" />

      <motion.div
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative mt-4 bg-gradient-to-b from-navy-light to-navy border border-border overflow-hidden"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
        }}
      >
        <div className="px-4 pt-4 pb-8 text-center">
          <p className="text-[9px] text-muted uppercase tracking-[0.2em] mb-2 font-semibold">
            {record.label}
          </p>
          <p className="text-3xl md:text-4xl font-black text-red font-mono leading-none mb-2">
            {record.value > 0 ? (
              <>
                {record.prefix}
                <AnimatedNumber from={0} to={record.value} />
                {record.suffix}
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="text-xs font-semibold">{getNickname(record.player)}</p>
          {record.season && (
            <p className="text-[9px] text-muted mt-1">{record.season}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ClubRecords({ records }: { records: AllTimeRecord[] }) {
  const skaterRecords = records.filter((r) => r.category === "skater");
  const goalieRecords = records.filter((r) => r.category === "goalie");

  return (
    <section className="py-20 bg-navy-dark relative overflow-hidden">
      {/* Subtle bg accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <FadeUp>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold uppercase tracking-wider mb-3">
              Club Records
            </h2>
            <p className="text-muted text-xs uppercase tracking-widest">
              Hanging in the rafters
            </p>
          </div>
        </FadeUp>

        {/* Skater Records */}
        <FadeUp delay={0.1}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-red mb-6 text-center">
            Skater Records
          </h3>
        </FadeUp>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2 mb-12">
          {skaterRecords.map((record, i) => (
            <RecordBannerSmall key={record.label} record={record} index={i} />
          ))}
        </div>

        {/* Goalie Records */}
        <FadeUp delay={0.1}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-red mb-6 text-center">
            Goalie Records
          </h3>
        </FadeUp>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2 mb-10">
          {goalieRecords.map((record, i) => (
            <RecordBannerSmall key={record.label} record={record} index={i} />
          ))}
        </div>

        <FadeUp delay={0.3}>
          <div className="text-center">
            <Link
              href="/records"
              className="inline-block text-sm font-medium text-red hover:text-white transition-colors uppercase tracking-wider border border-red/30 hover:border-red px-6 py-3 rounded-lg"
            >
              View All Records →
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
