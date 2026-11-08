import { NextRequest, NextResponse } from "next/server";
import { getNotifyRedis, KEYS, newToken, type Subscriber, type Topic } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const redis = getNotifyRedis();
  const done = (status: string) => NextResponse.redirect(new URL(`/subscribe?status=${status}`, request.url), 303);
  if (!redis || !token) return done("invalid");
  const pending = await redis.getdel<{ email: string; topics: Topic[] }>(KEYS.pending(token));
  if (!pending) return done("invalid");
  // Re-subscribing updates topics but keeps the existing unsubscribe token.
  const existing = await redis.hget<Subscriber>(KEYS.subscribers, pending.email);
  const subscriber: Subscriber = { email: pending.email, topics: pending.topics,
    token: existing?.token ?? newToken(), confirmedAt: new Date().toISOString() };
  await redis.hset(KEYS.subscribers, { [subscriber.email]: subscriber });
  await redis.hset(KEYS.tokens, { [subscriber.token]: subscriber.email });
  return done("confirmed");
}
