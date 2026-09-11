"use client";

import { useEffect, useRef } from "react";
import markup from "./markup.json";
import { initializeRecords } from "./initialize";
import "./records.css";

export default function RecordsRedesign() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    // Reset on remount/Strict Mode before attaching scoped interactions.
    root.innerHTML = markup;
    return initializeRecords(root);
  }, []);
  return <div ref={host} className="records-redesign vault" />;
}
