"use client";

import { useState } from "react";
import LinePlanner from "./LinePlanner";
import type { LineDataset } from "./line-datasets";
import "./line-planner.css";

/** Remount on season change so selections and browser drafts never mix seasons. */
export default function LineSeasonSelector({ current, archive }: { current: LineDataset; archive: LineDataset }) {
  const [selected, setSelected] = useState(current.id);
  const dataset = selected === archive.id ? archive : current;
  return <section className="line-season-workspace" id="lines" aria-labelledby="line-title">
    <header className="line-heading">
      <div><p className="line-eyebrow">01 / THE LINE BUILDER</p><h2 id="line-title">FIND YOUR <em>CHEMISTRY.</em></h2><p>Pick your players. See their grades. Find a line that clicks.</p></div>
      <div className="line-season-selector" role="group" aria-label="Line builder season">
        {[current, archive].map(item => <button key={item.id} type="button" aria-pressed={dataset.id === item.id} onClick={() => setSelected(item.id)}><span>{item.kind === "current" ? "This season" : "Archive"}</span><strong>{item.season}</strong></button>)}
      </div>
    </header>
    <LinePlanner key={dataset.id} dataset={dataset} />
  </section>;
}
