/**
 * The club's clock. The whole team plays on US Central Time, so every week
 * boundary (Player of the Week, weekly match groupings) and every displayed
 * game date uses America/Chicago, including its CST/CDT daylight-saving shifts.
 *
 * Weeks run Monday 00:00 Central (inclusive) to the next Monday 00:00 Central
 * (exclusive). Because of DST a week is not always exactly 7 * 24 hours, so
 * always step weeks with addClubWeeks() rather than adding a fixed duration.
 */
export const CLUB_TIME_ZONE = "America/Chicago";
/** Short human label for the club's time zone. */
export const CLUB_TIME_LABEL = "CT";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIME_ZONE, hourCycle: "h23",
  year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
});

/** Inside JavaScript's Date range (±8.64e15 ms); outside it, Intl throws. */
const representable = (ms: number) => Number.isFinite(ms) && Number.isFinite(new Date(ms).getTime());

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function clubParts(ms: number): Parts {
  const out: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(new Date(ms))) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute, second: out.second };
}

/** Central's offset from UTC at an instant, in ms (e.g. -5h during CDT). */
function clubOffset(ms: number): number {
  const p = clubParts(ms);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

/** Instant of 00:00 Central on a Central calendar date. Day overflow is allowed (Date.UTC normalises it).
 * Midnight never falls inside a Central DST gap (shifts happen at 02:00), so this is unambiguous. */
function clubMidnight(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day);
  if (!representable(guess)) return NaN;
  let instant = guess - clubOffset(guess);
  if (!representable(instant)) return NaN;
  const corrected = guess - clubOffset(instant);
  if (corrected !== instant) instant = corrected;
  return representable(instant) ? instant : NaN;
}


/** Monday 00:00 Central of the week containing `ms` (epoch milliseconds). NaN in, NaN out. */
export function clubWeekStart(ms: number): number {
  if (!representable(ms)) return NaN;
  const p = clubParts(ms);
  // Weekday of the Central calendar date (0 = Sunday), independent of the host's zone.
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return clubMidnight(p.year, p.month, p.day - (weekday + 6) % 7);
}

/** Step a Central week start by whole weeks, landing on Monday 00:00 Central (DST-safe). */
export function addClubWeeks(weekStart: number, weeks: number): number {
  if (!representable(weekStart)) return NaN;
  const p = clubParts(weekStart);
  return clubMidnight(p.year, p.month, p.day + 7 * weeks);
}

/** Format an instant as a Central calendar date/time. */
export function formatClubDate(value: number | string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString("en-US", { ...options, timeZone: CLUB_TIME_ZONE });
}

/** "Oct 19 – Oct 25" style label for a week, given its start and exclusive end. */
export function formatClubWeekRange(start: number | string, end: number | string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  const first = new Date(start).getTime(), last = new Date(end).getTime() - 1;
  return `${formatClubDate(first, options)} – ${formatClubDate(last, options)}`;
}
