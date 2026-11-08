import type { Metadata } from "next";
import SubscribeForm from "@/components/SubscribeForm";
import "@/components/subscribe.css";
import "../news/news.css";

export const metadata: Metadata = { title: "Email Updates | Bardownski Hockey", robots: { index: false } };

const MESSAGES: Record<string, [string, string]> = {
  confirmed: ["You're subscribed.", "You'll get the updates you picked: new articles, Player of the Week, MVP race lead changes and broken club records."],
  unsubscribed: ["You're unsubscribed.", "You won't get any more emails from us. You can sign up again any time."],
  invalid: ["That link didn't work.", "It may have expired or already been used. Sign up again below."],
};

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ status?: string; unsubscribe?: string }> }) {
  const { status, unsubscribe } = await searchParams;
  const [title, text] = (status && MESSAGES[status]) || ["Email updates.", "New articles, Player of the Week, MVP race lead changes and broken club records, straight to your inbox."];
  return <div className="news-edition news-index">
    <header className="news-masthead">
      <div className="news-masthead-copy">
        <p className="news-eyebrow">Bardownski / Email updates</p>
        <h1>{unsubscribe ? "Unsubscribe?" : title}</h1>
        {unsubscribe
          ? <form method="post" action="/api/subscribe/unsubscribe" className="subscribe-form">
              <p className="news-masthead-intro">Stop all Bardownski emails to this address.</p>
              <input type="hidden" name="token" value={unsubscribe} />
              <button type="submit">Unsubscribe</button>
            </form>
          : <>
              <p className="news-masthead-intro">{text}</p>
              {status !== "confirmed" && <SubscribeForm />}
            </>}
      </div>
    </header>
  </div>;
}
