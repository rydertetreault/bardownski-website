"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const tabs = [
  { id: "ideas", label: "Suggested lines", hash: "#recommendations-title" },
  { id: "stats", label: "Goalie stats with this line", hash: "#goalies" },
] as const;
type IdeasTab = typeof tabs[number]["id"];
const hashTabs: Record<string, IdeasTab> = {
  "#goalies": "stats",
  "#chemistry-method": "ideas",
  "#line-insights": "ideas",
  "#line-ideas": "ideas",
  "#recommendations-title": "ideas",
  "#line-pair-title": "ideas",
};

/** Only the active content mounts; the planner owns all persistent insight data. */
export default function LineIdeas({ panels, method, season }: {
  panels: Record<IdeasTab, ReactNode>;
  method: ReactNode;
  season: string;
}) {
  const [active, setActive] = useState<IdeasTab>("ideas");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    let frame = 0;
    let scrollFrame = 0;
    function navigate(hash: string) {
      const tab = hashTabs[hash];
      if (!tab) return;
      setActive(tab);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      // The shared method is already mounted, including on Activity reactivation.
      // Open it before paint; only scrolling needs to wait for the selected panel.
      const details = document.getElementById(hash.slice(1));
      if (details instanceof HTMLDetailsElement) details.open = true;
      // Allow the selected panel to mount before resolving its legacy anchor.
      frame = requestAnimationFrame(() => {
        scrollFrame = requestAnimationFrame(() => {
          const target = document.getElementById(hash.slice(1)) ?? document.getElementById("line-ideas-panel");
          target?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
            block: "start",
          });
        });
      });
    }
    const onHashChange = () => navigate(window.location.hash);
    function onClick(event: MouseEvent) {
      // The parent captures legacy links and dispatches hashchange itself.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !hashTabs[url.hash]) return;
      event.preventDefault();
      if (window.location.hash !== url.hash) window.history.pushState(window.history.state, "", url.hash);
      // Also handle clicking an existing hash after manually switching tabs.
      navigate(url.hash);
    }
    // Read existing deep links synchronously on mount and Activity reactivation.
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, []);

  function selectTab(tab: typeof tabs[number]) {
    setActive(tab.id);
    const url = new URL(window.location.href);
    url.hash = tab.hash;
    // Keep the parent tool query and router state; tabbing should not add a
    // history entry or scroll the user away from the tab strip.
    window.history.replaceState(window.history.state, "", url);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % tabs.length; break;
      case "ArrowLeft": next = (index + tabs.length - 1) % tabs.length; break;
      case "Home": next = 0; break;
      case "End": next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectTab(tabs[next]);
    tabRefs.current[next]?.focus();
  }

  return <section className="line-ideas" id="line-ideas" aria-labelledby="line-ideas-title">
    <header className="line-ideas-heading">
      <h3 id="line-ideas-title">Line ideas</h3>
      <span>{season}</span>
    </header>
    <div className="line-ideas-tabs" role="tablist" aria-label="Line ideas">
      {tabs.map((tab, index) => <button
        key={tab.id}
        ref={node => { tabRefs.current[index] = node; }}
        type="button"
        role="tab"
        id={`line-ideas-tab-${tab.id}`}
        aria-selected={active === tab.id}
        aria-controls="line-ideas-panel"
        tabIndex={active === tab.id ? 0 : -1}
        onClick={() => selectTab(tab)}
        onKeyDown={event => onKeyDown(event, index)}
      >{tab.label}</button>)}
    </div>
    <div id="line-ideas-panel" role="tabpanel" aria-labelledby={`line-ideas-tab-${active}`} tabIndex={0}>
      {panels[active]}
    </div>
    {method}
  </section>;
}
