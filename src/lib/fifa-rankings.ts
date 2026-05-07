import rankingSnapshot from "@/generated/fifa-men-rankings.json";

type RankingSnapshot = {
  source: string;
  officialUpdate: string;
  fetchedAt: string;
  teams: Record<string, { fifaCode: string; rank: number }>;
};

const snapshot = rankingSnapshot as RankingSnapshot;

export function getLatestFifaRank(teamName: string | null | undefined): number | null {
  if (!teamName) return null;
  return snapshot.teams[teamName]?.rank ?? null;
}

export function getLatestFifaRankingSnapshot() {
  return snapshot;
}
