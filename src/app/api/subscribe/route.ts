import { NextRequest, NextResponse } from "next/server";
import { confirmEmail, getNotifyRedis, KEYS, newToken, normalizeEmail, parseTopics, sendEmails, siteUrl } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Starts double opt-in. The response never reveals whether an address is already subscribed. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; topics?: unknown; website?: unknown } | null;
  if (body?.website) return NextResponse.json({ ok: true }); // honeypot field; bots fill it
  const email = normalizeEmail(body?.email), topics = parseTopics(body?.topics);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!topics.length) return NextResponse.json({ error: "Pick at least one update." }, { status: 400 });
  const redis = getNotifyRedis();
  if (!redis || !process.env.RESEND_API_KEY) return NextResponse.json({ error: "Subscriptions aren't available right now." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const hits = await redis.incr(KEYS.rate(ip));
  if (hits === 1) await redis.expire(KEYS.rate(ip), 3600);
  if (hits > 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  // One confirmation email per address per 10 minutes, so the form can't be used to spam someone.
  if (await redis.set(KEYS.cooldown(email), 1, { nx: true, ex: 600 })) {
    const token = newToken();
    await redis.set(KEYS.pending(token), { email, topics }, { ex: 48 * 3600 });
    try {
      await sendEmails([confirmEmail(email, `${siteUrl()}/api/subscribe/confirm?token=${token}`)]);
    } catch (error) {
      await redis.del(KEYS.cooldown(email));
      console.error("[subscribe] confirmation email failed:", (error as Error).message);
      return NextResponse.json({ error: "We couldn't send the confirmation email. Try again later." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
