import { NextRequest, NextResponse } from "next/server";
import { getNotifyRedis, unsubscribe } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** POST only: the /subscribe page's button and mail clients' one-click unsubscribe (RFC 8058).
 * Link scanners that prefetch GET URLs can't unsubscribe anyone. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = request.nextUrl.searchParams.get("token") ?? String(form?.get("token") ?? "");
  const redis = getNotifyRedis();
  const removed = !!redis && !!token && await unsubscribe(redis, token);
  if (form?.has("token")) return NextResponse.redirect(new URL(`/subscribe?status=${removed ? "unsubscribed" : "invalid"}`, request.url), 303);
  return NextResponse.json({ ok: removed });
}
