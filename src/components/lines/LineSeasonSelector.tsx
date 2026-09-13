"use client";

import { useState } from "react";
import LinePlanner from "./LinePlanner";
import type { LineDataset } from "./line-datasets";
import "./line-planner.css";

/** Dataset switches remount the planner: no selected players or availability
 * from one club/season can leak into another. Restoring a draft is explicit. */
export default function LineSeasonSelector({ current, archive }: { current: LineDataset; archive: LineDataset }) {
  const [selected, setSelected] = useState(current.id);
  const dataset = selected === archive.id ? archive : current;
  return <section className="line-season-workspace" id="lines" aria-label="Lines and chemistry">
    <div className="line-season-selector">
      <div><label htmlFor="line-season">Line dataset</label>
        <select id="line-season" value={dataset.id} onChange={event => setSelected(event.target.value)}>
          <option value={current.id}>{current.season} · Current season</option>
          <option value={archive.id}>{archive.season} · Archive</option>
        </select>
      </div>
      <p>Each season uses its own members and saved games. Switching seasons clears the working line; saved drafts stay separate.</p>
    </div>
    <LinePlanner key={dataset.id} dataset={dataset} />
  </section>;
}
