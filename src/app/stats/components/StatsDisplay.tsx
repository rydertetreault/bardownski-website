"use client";
import { motion } from "framer-motion";
import { useHockeyMotionPaused } from "@/components/layout/hockey-motion-preference";
import type { ParsedStats, EnrichedPlayer, StatEntry } from "@/lib/discord";
import { getEnrichedPlayers } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

const metrics: {key: keyof EnrichedPlayer; label: string; percent?: boolean}[] = [
  {key:"gamesPlayed",label:"Games played"},{key:"points",label:"Points"},{key:"goals",label:"Goals"},{key:"assists",label:"Assists"},{key:"plusMinus",label:"Plus / minus"},{key:"hits",label:"Hits"},{key:"shots",label:"Shots"},{key:"shotPercentage",label:"Shooting %",percent:true},{key:"passPercentage",label:"Passing %",percent:true},{key:"pim",label:"Penalty minutes"},{key:"gwg",label:"Game-winning goals"},{key:"takeaways",label:"Takeaways"},{key:"giveaways",label:"Giveaways"},{key:"blockedShots",label:"Blocked shots"},{key:"interceptions",label:"Interceptions"},{key:"faceoffPct",label:"Faceoff %",percent:true},{key:"goalieGamesPlayed",label:"Goalie games"},{key:"saves",label:"Saves"},{key:"savePercentage",label:"Save %",percent:true},{key:"gaa",label:"Goals against avg."},{key:"shutouts",label:"Shutouts"},{key:"shutoutPeriods",label:"Shutout periods"},
];
function value(player: EnrichedPlayer | undefined, metric: typeof metrics[number]) {
  const v = player?.[metric.key];
  return typeof v === "number" ? `${v.toLocaleString("en-US", {maximumFractionDigits:2})}${metric.percent ? "%" : ""}` : "—";
}
export function StatsDisplay({ stats }: {stats: ParsedStats}) {
  const players = getEnrichedPlayers(stats);
  const reducedMotion = useHockeyMotionPaused();
  const leaders: {label:string; entries:StatEntry[]; secondary?:string}[] = [{label:"Points",entries:stats.points,secondary:"GP"},{label:"Goals",entries:stats.goals,secondary:"SH%"},{label:"Assists",entries:stats.assists,secondary:"PASS%"},{label:"Plus / minus",entries:stats.plusMinus},{label:"Hits",entries:stats.hits,secondary:"PIM"},{label:"Saves",entries:stats.saves,secondary:"SV%"},{label:"Shutouts",entries:stats.shutouts,secondary:"SOP"}];
  return <>
    <div className="stats-subhead"><h3>Setting the pace.</h3><span>THE CATEGORY LEADERS</span></div>
    <div className="stats-leaders">{leaders.filter(l => l.entries.length).map(({label,entries,secondary}, index) => <motion.article key={label} className={`stats-leader stats-leader-${index}`} initial={false} animate={reducedMotion ? {opacity:1,y:0} : undefined} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.12}} transition={{duration:reducedMotion ? 0 : 0.6,delay:reducedMotion ? 0 : (index % 3)*0.08}} whileHover={reducedMotion ? undefined : {y:-6}}><span className="stats-leader-index" aria-hidden="true">0{index + 1}</span><p className="stats-eyebrow">{label}</p><strong className="stats-leader-total">{entries[0].value.toLocaleString("en-US")}</strong><h4>{getNickname(entries[0].name)}</h4><ol>{entries.slice(0,5).map((entry,i) => <li key={entry.name}><span>{entry.rank || i + 1}</span><span>{getNickname(entry.name)}</span><b>{entry.value.toLocaleString("en-US")}</b>{secondary && <small>{entry.secondary === undefined ? "—" : entry.secondary} {secondary}</small>}</li>)}</ol></motion.article>)}</div>
    {players.length > 0 && <>
      <section className="stats-profiles"><div className="stats-subhead"><h3>The full picture.</h3><span>INDIVIDUAL PLAYER PROFILES</span></div>{players.map(player => <details key={player.name} className="stats-profile"><summary><span>{getNickname(player.name)}<small>{player.position}</small></span><span className="stats-profile-hint">View stats +</span></summary><div className="stats-profile-grid">{metrics.filter(m => player[m.key] !== undefined).map(m => <div key={m.key}><small>{m.label}</small><strong>{value(player,m)}</strong></div>)}</div></details>)}</section>
    </>}
    {stats.milestones.length > 0 && <section className="stats-milestones"><div className="stats-subhead"><h3>Milestones.</h3></div>{stats.milestones.map(m => <article key={m.name}><h4>{getNickname(m.name)}</h4><ul>{m.achievements.map(t => <li key={t}>{t}</li>)}</ul></article>)}</section>}
  </>;
}
