"use client";

import Image from "next/image";
import { useState } from "react";
import { getClubCrestUrl, type ClubCrest } from "@/lib/club-crest";

function CrestImage({ src, opponent, className }: { src: string | null; opponent: string; className: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return <span className={`opponent-crest ${className}`} data-crest-state={src ? state : "missing"} aria-hidden="true">
    {/* The adjacent team name supplies the accessible identity. Keep initials
        visible until decode succeeds, including no-JS and slow/error cases. */}
    {state !== "loaded" && <span className="opponent-crest__fallback">{opponent.trim().slice(0, 2).toUpperCase() || "VS"}</span>}
    {src && state !== "error" && <Image
      data-brand-mark
      className="opponent-crest__image"
      src={src}
      alt=""
      width={128}
      height={128}
      unoptimized
      referrerPolicy="no-referrer"
      onLoad={() => setState("loaded")}
      onError={() => setState("error")}
    />}
  </span>;
}

/** Chelstats supplies small crest PNGs directly; bypass Next's image optimizer
 * rather than granting its server a new remote-image fetch origin. Only the
 * validated, fixed-host crest resolver can produce a URL. A new URL remounts
 * the loader so one failed crest cannot poison another match's image. */
export default function OpponentCrest({ opponent, crest, className = "" }: { opponent: string; crest?: ClubCrest; className?: string }) {
  const src = getClubCrestUrl(crest);
  return <CrestImage key={src ?? "missing"} src={src} opponent={opponent} className={className} />;
}
