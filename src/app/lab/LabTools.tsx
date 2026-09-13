"use client";

import dynamic from "next/dynamic";
import { Activity, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ComparisonSeason } from "@/lib/player-comparison";
import type { LineDataset } from "@/components/lines/line-datasets";

const LineSeasonSelector = dynamic(() => import("@/components/lines/LineSeasonSelector"), {
  loading: () => <p className="lab-tool-loading" role="status">Opening the line builder…</p>,
});
const HeadToHeadCard = dynamic(() => import("./components/HeadToHeadCard").then(module => module.HeadToHeadCard), {
  loading: () => <p className="lab-tool-loading" role="status">Opening player comparison…</p>,
});

export type LabTool = "lines" | "comparison";
const tools: { id: LabTool; label: string; description: string }[] = [
  { id: "lines", label: "Line builder", description: "Build a lineup. Find the fit." },
  { id: "comparison", label: "Player comparison", description: "Two players. Every angle." },
];
const lineAnchors = new Set(["lines", "line-board", "line-insights", "line-ideas", "goalie-compatibility", "goalies", "chemistry-method", "recommendations-title", "line-pair-title"]);

function toolForHash(hash: string): LabTool | null {
  const anchor = hash.replace(/^#/, "");
  return anchor === "comparison" ? "comparison" : lineAnchors.has(anchor) ? "lines" : null;
}

/** Only load a tool on its first visit. Activity preserves the draft/matchup
 * when switching away, and suspends effects while the tool is hidden. */
export default function LabTools({ current, archive, seasons, pendingSeason, initialTool = "lines" }: {
  current: LineDataset;
  archive: LineDataset;
  seasons: ComparisonSeason[];
  pendingSeason?: string;
  initialTool?: LabTool;
}) {
  const [selected, setSelected] = useState<LabTool>(initialTool);
  const [visited, setVisited] = useState<Record<LabTool, boolean>>({ lines: initialTool === "lines", comparison: initialTool === "comparison" });
  const pendingAnchor = useRef<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function activate(tool: LabTool, anchor?: string) {
    pendingAnchor.current = anchor ?? null;
    setVisited(previous => previous[tool] ? previous : { ...previous, [tool]: true });
    setSelected(tool);
  }

  function choose(tool: LabTool) {
    // Native history lets back/forward revisit the tool without refetching or
    // clearing a user's unsaved line. Keep Next's existing history state.
    const url = new URL(window.location.href);
    url.searchParams.set("tool", tool);
    url.hash = tool;
    history.pushState(history.state, "", url);
    activate(tool);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // Tool buttons should stay in view rather than jumping below themselves.
    pendingAnchor.current = null;
  }

  useEffect(() => {
    function followLocation() {
      const requested = toolForHash(window.location.hash);
      const query = new URLSearchParams(window.location.search).get("tool");
      activate(requested ?? (query === "comparison" ? "comparison" : "lines"), requested ? window.location.hash.slice(1) : undefined);
    }
    function followLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== location.origin || url.pathname !== "/lab") return;
      const tool = toolForHash(url.hash);
      if (!tool) return;
      // Let same-tool links reach the nested insights switch; intercept cross-tool
      // links so the target exists before scrolling (including shared navbar links).
      event.preventDefault();
      url.searchParams.set("tool", tool);
      history.pushState(history.state, "", url);
      activate(tool, url.hash.slice(1));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    const frame = requestAnimationFrame(followLocation);
    window.addEventListener("hashchange", followLocation);
    window.addEventListener("popstate", followLocation);
    document.addEventListener("click", followLink, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", followLocation);
      window.removeEventListener("popstate", followLocation);
      document.removeEventListener("click", followLink, true);
    };
  }, []);

  useEffect(() => {
    // Dynamic imports and nested insight panels may not be committed immediately.
    // A short bounded retry handles both without scrolling to a hidden element.
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    function scroll() {
      const anchor = pendingAnchor.current;
      if (!anchor) return;
      const target = document.getElementById(anchor === "line-insights" ? "line-ideas" : anchor);
      if (target && target.getClientRects().length && getComputedStyle(target).display !== "none") {
        if (target instanceof HTMLDetailsElement) target.open = true;
        target.scrollIntoView({ block: "start", behavior: "instant" });
        pendingAnchor.current = null;
      } else if (attempts++ < 25) timer = setTimeout(scroll, 80);
    }
    timer = setTimeout(scroll, 0);
    window.addEventListener("hashchange", scroll);
    return () => { clearTimeout(timer); window.removeEventListener("hashchange", scroll); };
  }, [selected]);

  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tools.length - 1
      : event.key === "ArrowRight" ? (index + 1) % tools.length
        : event.key === "ArrowLeft" ? (index + tools.length - 1) % tools.length : null;
    if (next === null) return;
    event.preventDefault();
    tabRefs.current[next]?.focus();
    choose(tools[next].id);
  }

  return <div className="lab-tools">
    <div className="lab-tool-picker" id="lab-tools">
      <div className="lab-tool-picker-copy"><span>CHOOSE YOUR TOOL</span><p>One workspace. Your call.</p></div>
      <div className="lab-tool-tabs" role="tablist" aria-label="Player Lab tools">
        {tools.map((tool, index) => <button key={tool.id} id={`lab-tool-tab-${tool.id}`} type="button" role="tab"
          ref={node => { tabRefs.current[index] = node; }} aria-selected={selected === tool.id}
          aria-controls={`lab-tool-panel-${tool.id}`} tabIndex={selected === tool.id ? 0 : -1}
          onClick={() => choose(tool.id)} onKeyDown={event => onKey(event, index)}>
          <span className="lab-tool-number" aria-hidden="true">0{index + 1}</span>
          <span><strong>{tool.label}</strong><small>{tool.description}</small></span>
          <span className="lab-tool-arrow" aria-hidden="true">{selected === tool.id ? "↓" : "↗"}</span>
        </button>)}
      </div>
    </div>
    {tools.map(tool => <div key={tool.id} id={`lab-tool-panel-${tool.id}`} role="tabpanel"
      aria-labelledby={`lab-tool-tab-${tool.id}`} hidden={selected !== tool.id} tabIndex={0}>
      {visited[tool.id] && <Activity mode={selected === tool.id ? "visible" : "hidden"}>
        {tool.id === "lines" ? <LineSeasonSelector current={current} archive={archive} />
          : <HeadToHeadCard seasons={seasons} pendingSeason={pendingSeason} />}
      </Activity>}
    </div>)}
  </div>;
}
