"use client";

import { useEffect, useRef } from "react";

export type PositionSceneKind = "forwards" | "defense" | "goalies";

const chapters = {
  forwards: { number: "01", title: "THE ATTACK", words: ["Create.", "Finish.", "Repeat."] },
  defense: { number: "02", title: "THE BACKBONE", words: ["Hold", "the line."] },
  goalies: { number: "03", title: "THE LAST LINE", words: ["Nothing", "past us."] },
};

export default function PositionScene({ kind, label, caption, count }: {
  kind: PositionSceneKind; label: string; caption: string; count: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const chapter = chapters[kind];

  useEffect(() => {
    const node = root.current;
    if (!node || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        node.classList.add("scene-playing");
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function replay() {
    const node = root.current;
    if (!node) return;
    node.classList.remove("scene-playing");
    void node.offsetWidth;
    node.classList.add("scene-playing");
  }

  return (
    <div ref={root} className={`position-scene scene-${kind}`}>
      <div className="chapter-meta">
        <span>{chapter.number} / {chapter.title}</span>
        <span>{String(count).padStart(2, "0")} {count === 1 ? "PLAYER" : "PLAYERS"}</span>
      </div>
      <div className="chapter-body">
        <div className="roster-chapter-heading">
          <h3 id={`group-${kind}`}>{label}</h3>
          <p>{caption}</p>
        </div>
        <div className="chapter-statement" aria-hidden="true">
          {chapter.words.map((word, i) => (
            <span className="chapter-word-mask" key={word}>
              <span className="chapter-word" style={{ animationDelay: `${i * 95}ms` }}>{word}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="chapter-bottom">
        <span>BARDOWNSKI / THE ROSTER</span>
        <button type="button" onClick={replay} className="scene-replay" aria-label={`Replay ${label.toLowerCase()} animation`}>Replay motion <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  );
}
