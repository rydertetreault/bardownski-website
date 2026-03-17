export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string;
  image?: string;
  video?: string;
  category: string;
}

export const articles: Article[] = [
  {
    id: "5",
    title: "Xavier Laflamme Drops 2026 Highlight Reel",
    summary:
      "Xavier Laflamme has officially released his 2026 highlight video — and it doesn't disappoint. The reel showcases the full range of his game: the hands, the vision, and the relentless physical play that's made him one of the most dominant forces in the league this season.\n\nWith 776 points on the year and milestones in goals, assists, and hits all stacking up, Xavier Laflamme's tape is a reminder of why he's sitting at the top of the leaderboard. From top-shelf snipes to tape-to-tape feeds, this one's worth a watch.",
    date: "2026-03-17",
    video: "/videos/dylan - 2026.mp4",
    category: "Highlights",
  },
  {
    id: "4",
    title: "Player of the Cycle: Xavier Laflamme Dominates Back-to-Back Drops With 183 Combined Points",
    summary:
      "Across two consecutive stats drops (March 16th and 17th), Xavier Laflamme put together one of the most dominant stretches in club history — 111 goals, 72 assists, and 272 hits for 183 combined points. He seized the points lead, overtook Matt Hut for the all-time goals crown (479 to 456), and crossed the 1500 hits, 400 goals, 300 assists, and 350 assists milestones along the way. His totals now sit at 846 points, 479 goals, 367 assists, and 1618 hits — leading every major offensive category.\n\nGotta Be made his presence felt across both cycles as well — 56 goals and 48 assists for 104 points added, rocketing from the fringes of the top 5 to 3rd in points (291), 3rd in goals (107), and 3rd in assists (184). His shot percentage peaked at 35.2%, the best on the team. But Xavier Laflamme's volume was simply on another level.\n\nJRT IV crossed 1000 career saves and 100 goalie games played over the two cycles, adding 3 shutouts to hold at 7 on the season. In the end, the combined output from Xavier Laflamme made this an easy call — 183 points in two drops is a pace no one else has come close to matching.",
    date: "2026-03-17",
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183904.png",
    category: "Announcements",
  },
  {
    id: "3",
    title: "Stats Drop: Shakeup at the Top of the Goals Race, Gotta Be Cracks Top 3",
    summary:
      "The March 16th and 17th stats drops combined for one of the biggest shakeups of the season. Xavier Laflamme added 183 points across two cycles — 111 goals, 72 assists, and 272 hits — seizing the points lead with 846 and overtaking Matt Hut for the all-time goals crown (479 to 456). He crossed the 1500 hits, 400 goals, 300 assists, and 350 assists milestones. Matt Hut answered with milestones of his own: 450 goals, 300 assists, and 1000 hits.\n\nThe story of the stretch though is Gotta Be. After flying under the radar, he exploded onto every leaderboard — going from the fringes of the top 5 to 3rd in points (291), 3rd in goals (107), and 3rd in assists (184). He crossed 100 goals, 150 assists, and 250 points along the way, all while posting a 35.2% shot percentage — the best on the team.\n\nMilestones were flying across the board: JRT IV hit 1000 career saves and 100 goalie games played, Wolfgang Mozart crossed 150 assists, Slobby Robby hit 150 assists, and Jimmy Lemons quietly reached 100 assists. The gap at the top is widening, but the middle of the pack is tighter than ever.",
    date: "2026-03-17",
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183710.png",
    category: "Stats",
  },
  {
    id: "2",
    title: "Bardownski Competes in Div 1 Club Finals",
    summary:
      "Bardownski competed in the highest division of Club Finals (Div 1). After a rocky start, the squad managed to fight their way into the second round but ultimately fell short due to time constraints. A strong showing against top-tier competition.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/team2.png",
    category: "Results",
  },
  {
    id: "1",
    title: "Welcome to Bardownski",
    summary:
      "The official Bardownski website is now live. Stay tuned for roster updates, match results, and player stats from our Newfoundland-based club.",
    date: "2026-03-09",
    image: "/images/gallery/screenshots/team%20over.png",
    category: "Club News",
  },
];
