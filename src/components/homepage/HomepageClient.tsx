"use client";

import { useEffect, useRef } from "react";
import type { Article } from "@/lib/news";
import { createHomeRuntime } from "./runtime";
import { initMotion } from "./motion";
import { initRefinedMotion } from "./refined-motion";
import { initContentMotion } from "./content-motion";
import { initHomeInteractions } from "./interactions";

type Props = { markup: string; articles: Article[] };

/** HTML is rendered on the server for SEO/no-JS, then enhanced inside this
 * isolated subtree. Reset on Strict Mode remount; dispose every observer/listener. */
export default function HomepageClient({ markup, articles }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !content.current) return;
    content.current.innerHTML = markup;
    const runtime = createHomeRuntime(root.current);
    const motion = initMotion(runtime);
    initHomeInteractions(runtime, motion, articles);
    initRefinedMotion(runtime, motion.refresh);
    initContentMotion(runtime);
    const toggle = root.current.querySelector<HTMLButtonElement>(".motion-toggle");
    if (toggle) toggle.hidden = false;
    return () => runtime.dispose();
  }, [markup, articles]);
  return <div ref={root} className="bd-home demo demo-10 hybrid">
    <a className="skip-link" href="#home-content">Skip to homepage content</a>
    <div ref={content} id="home-content" data-home-content className="hybrid-main" dangerouslySetInnerHTML={{ __html: markup }} />
  </div>;
}
