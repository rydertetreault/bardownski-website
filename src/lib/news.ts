export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string;
  image?: string;
  category: string;
}

export const articles: Article[] = [
  {
    id: "4",
    title: "Player of the Cycle: Dylan Edges Out Kaden in One of the Closest Votes of the Season",
    summary:
      "After the March 16th stats drop, the Player of the Cycle vote was one of the tightest in recent memory — and for good reason. Dylan earned the nod, but Kaden pushed him harder than anyone has this season, and Ryder made a case that's hard to ignore from the crease.\n\nDylan's numbers speak for themselves: 67 goals, 46 assists, and 136 hits in the cycle — 113 points added in a single drop. He simultaneously crossed the 1500 hits, 400 goals, and 300 assists milestones, a triple-milestone cycle that may never be matched. His total of 776 points puts him at the top of the leaderboard and his physical dominance continued to be a difference-maker every shift. Volume, efficiency, and milestone impact: Dylan had all three.\n\nKaden, though, made this genuinely difficult. He went from flying under the radar to forcing his way into every conversation — 24 goals in a single cycle (51 to 75), cracking the top 5 in both points (235) and assists (160) for the first time. His shot percentage sat at 32.3% and his pass percentage at 78.0%, both among the best on the team. He also hit the 100 and 150 assists milestones in the same drop. The argument for Kaden was efficiency and momentum — he looked like the hottest player on the team. Had the vote been purely about trajectory, he wins.\n\nRyder also put forward a goalie's case: 3 shutouts this cycle, pushing his season total to 7, and crossing 1000 career saves. Three shutouts in a single drop is elite-level goaltending, and it kept Bardownski in games where the skaters needed time. He wasn't far off.\n\nUltimately, Dylan's combination of raw production, milestone achievements, and sustained dominance at the top of every leaderboard made him the selection — but this was the closest it's been all season. Kaden is knocking loud.",
    date: "2026-03-16",
    image: "/images/gallery/screenshots/Screenshot 2026-03-16 183904.png",
    category: "Announcements",
  },
  {
    id: "3",
    title: "Stats Drop: Dylan Seizes Points Lead as Kaden Breaks Into Every Leaderboard",
    summary:
      "The March 16th stats drop was one of the biggest cycles in recent memory. Dylan overtook Matt at the top of the points leaderboard with 776 points to Matt's 773 — a three-point gap after a massive two weeks that saw Dylan add 67 goals, 46 assists, and 136 hits, also crossing the 1500 hits, 400 goals, and 300 assists milestones in a single cycle. Matt answered with milestones of his own: 450 goals, 300 assists, and 1000 hits. The story of the cycle though is Kaden. After flying under the radar, he exploded onto every leaderboard — jumping from 5th in goals (51) to 4th with 75, cracking the top 5 in both points (235) and assists (160) for the first time, and doing it with some of the best efficiency numbers on the team at 32.3% shot percentage and 78.0% pass percentage. He hit the 100 and 150 assists milestones in the same drop. Meanwhile in net, Ryder crossed 1000 career saves and added two more shutouts to move to 7 on the season. Jimmy quietly hit 100 assists. The race at the top of the leaderboard is razor thin — this season is far from over.",
    date: "2026-03-16",
    image: "/images/gallery/screenshots/Screenshot 2026-03-16 183502.png",
    category: "Stats",
  },
  {
    id: "2",
    title: "Bardownski Competes in Div 1 Club Finals",
    summary:
      "Bardownski competed in the highest division of Club Finals (Div 1). After a rocky start, the squad managed to fight their way into the second round but ultimately fell short due to time constraints. A strong showing against top-tier competition.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/Screenshot 2026-03-16 183953.png",
    category: "Results",
  },
  {
    id: "1",
    title: "Welcome to Bardownski",
    summary:
      "The official Bardownski website is now live. Stay tuned for roster updates, match results, and player stats from our Newfoundland-based club.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/t.png",
    category: "Club News",
  },
];
