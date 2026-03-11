import Image from "next/image";
import type { Match } from "@/types";

const matches: Match[] = [];

export default function MatchesPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-xl overflow-hidden mb-12">
          <div className="relative h-48">
            <Image
              src="/images/logo/BD - stadium.png"
              alt="Arena"
              fill
              className="object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy-dark/80 to-transparent" />
          </div>
          <div className="absolute inset-0 flex items-center px-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-wider mb-1">Matches</h1>
              <p className="text-muted">Schedule and results.</p>
            </div>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-24 bg-navy border border-border rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-xl opacity-20">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted text-lg">Match schedule coming soon.</p>
            <p className="text-muted/50 text-sm mt-2">Results will be synced from Discord.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-navy border border-border rounded-xl p-6 flex items-center justify-between hover:border-red/50 transition-colors"
              >
                <div>
                  <p className="text-xs text-red font-medium uppercase tracking-wider mb-1">{match.date}</p>
                  <p className="font-bold text-lg">
                    {match.homeAway === "home"
                      ? `Bardownski vs ${match.opponent}`
                      : `${match.opponent} vs Bardownski`}
                  </p>
                  <p className="text-sm text-muted capitalize">{match.homeAway}</p>
                </div>
                <div className="text-right">
                  {match.status === "final" ? (
                    <p className="text-3xl font-black">
                      {match.scoreUs} <span className="text-muted">-</span> {match.scoreThem}
                    </p>
                  ) : (
                    <span className="text-sm text-red font-bold uppercase px-4 py-2 bg-red/10 border border-red/20 rounded-lg">
                      {match.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
