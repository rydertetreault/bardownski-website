"use client";

import { useState } from "react";
import { ZoomableImage } from "@/components/ui/MediaLightbox";

/** Article header photos readers can flip through. Slides share one grid cell, so the frame
 * keeps the tallest photo's height and every photo stays whole (never cropped). */
export default function ArticleImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const go = (step: number) => setIndex(i => (i + step + count) % count);
  return (
    <div className="article-carousel" role="region" aria-roledescription="carousel" aria-label={`${title}: photos`}
      onKeyDown={e => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}>
      <div className="article-carousel-track">
        {images.map((src, i) => (
          <div key={src} className="article-carousel-slide" aria-hidden={i !== index} inert={i !== index}
            role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
            <ZoomableImage src={src} alt={`${title} (photo ${i + 1} of ${count})`}
              sizes="(max-width: 900px) 100vw, 840px" className="block w-full h-auto" priority={i === 0} />
          </div>
        ))}
      </div>
      <button type="button" className="article-carousel-arrow prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
      <button type="button" className="article-carousel-arrow next" onClick={() => go(1)} aria-label="Next photo">›</button>
      <div className="article-carousel-dots">
        {images.map((src, i) => (
          <button key={src} type="button" aria-label={`Show photo ${i + 1}`} aria-current={i === index}
            className={i === index ? "active" : ""} onClick={() => setIndex(i)} />
        ))}
      </div>
    </div>
  );
}
