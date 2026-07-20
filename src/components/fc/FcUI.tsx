import Link from "next/link";
import type { ReactNode } from "react";

/* ── Shared Bardownski FC UI primitives (server-safe) ─────────────────── */

export const FC = {
  gold: "var(--fc-gold)",
  goldLight: "var(--fc-gold-light)",
  goldDark: "var(--fc-gold-dark)",
  bg: "var(--fc-bg)",
  bgDark: "var(--fc-bg-dark)",
  card: "var(--fc-card)",
  cardLight: "var(--fc-card-light)",
  border: "var(--fc-border)",
};

/** Full-page wrapper: grey bg + subtle gold radial accents. */
export function FcPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-24 pb-20" style={{ backgroundColor: FC.bg }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.06]"
          style={{
            background: `radial-gradient(circle at top right, #c9a227 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.04]"
          style={{
            background: `radial-gradient(circle at bottom left, #c9a227 0%, transparent 70%)`,
          }}
        />
      </div>
      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Page title block, PL-club style: label + huge black heading. */
export function FcPageHeader({
  label,
  title,
  titleAccent,
  right,
}: {
  label: string;
  title: string;
  titleAccent?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-[2px] rounded-full" style={{ backgroundColor: FC.gold }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: FC.gold }}>
            {label}
          </span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white leading-none">
          {title}
          {titleAccent && (
            <>
              {" "}
              <span style={{ color: FC.gold }}>{titleAccent}</span>
            </>
          )}
        </h1>
      </div>
      {right}
    </div>
  );
}

/** Section heading with gold accent bar. */
export function FcSectionHeading({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-white/60 flex items-center gap-3">
        <span className="w-8 h-[2px] rounded-full" style={{ backgroundColor: FC.gold }} />
        {children}
      </h2>
      {right}
    </div>
  );
}

/** Grey card container. */
export function FcCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ backgroundColor: FC.card, border: `1px solid var(--fc-border)` }}
    >
      {children}
    </div>
  );
}

/** W/L/D circle badge — gold for wins. */
export function FcResultBadge({
  result,
  forfeit,
  size = "md",
}: {
  result: string;
  forfeit?: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${cls}`}
      style={{
        color: result === "W" ? "#141414" : "#ffffff",
        backgroundColor: result === "W" ? "#c9a227" : "rgba(255,255,255,0.08)",
        border: `1px solid ${result === "W" ? "#c9a227" : "rgba(255,255,255,0.08)"}`,
      }}
      title={forfeit ? "Forfeit" : undefined}
    >
      {result}
    </span>
  );
}

/** Form guide dots (oldest → newest). */
export function FcFormGuide({ form }: { form: ("W" | "L" | "D")[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {form.map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold"
          style={{
            color: r === "W" ? "#141414" : "#ffffff",
            backgroundColor:
              r === "W"
                ? "#c9a227"
                : r === "D"
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.08)",
          }}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

/** Big-number stat card. */
export function FcStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: FC.card, border: `1px solid var(--fc-border)` }}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className="text-3xl font-bold" style={{ color: FC.goldLight }}>
        {value}
      </span>
      {sub && <span className="text-xs text-white/40">{sub}</span>}
    </div>
  );
}

/** "View all →" style link. */
export function FcViewAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:text-white"
      style={{ color: "var(--fc-gold)" }}
    >
      {children} →
    </Link>
  );
}

/** Fallback card when the live API is unavailable. */
export function FcDataUnavailable() {
  return (
    <div
      className="rounded-xl p-10 text-center"
      style={{ backgroundColor: FC.card, border: `1px solid var(--fc-border)` }}
    >
      <p className="text-white/60">Live stats are temporarily unavailable. Check back shortly.</p>
    </div>
  );
}
