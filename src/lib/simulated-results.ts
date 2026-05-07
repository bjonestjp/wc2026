import "server-only";

import { prisma } from "@/lib/prisma";
import { getLatestFifaRank } from "@/lib/fifa-rankings";
import { populateRoundOf32FromGroups, advanceFromFinalizedMatch } from "@/lib/knockouts";
import { recomputeAllUserScores } from "@/lib/scoreEngine";
import { MatchStage, MatchStatus } from "@prisma/client";

type ReadyMatch = {
  id: string;
  stage: MatchStage;
  kickoffAt: Date;
  simulationApplyAt: Date | null;
  simulationHomeScore: number | null;
  simulationAwayScore: number | null;
  simulationHomePenalties: number | null;
  simulationAwayPenalties: number | null;
  homeTeam: { name: string | null } | null;
  awayTeam: { name: string | null } | null;
};

function hashSeed(input: string) {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedInput: string) {
  const seedFactory = hashSeed(seedInput);
  return mulberry32(seedFactory());
}

function poisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count - 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function expectedGoals(homeRank: number, awayRank: number, jitter: number) {
  const homeStrength = 220 - homeRank;
  const awayStrength = 220 - awayRank;
  const diff = homeStrength - awayStrength;
  const swing = clamp(diff / 24, -1.1, 1.1);
  const base = 1.2 + jitter * 0.45;
  return {
    home: clamp(base + swing * 0.55, 0.2, 3.8),
    away: clamp(base - swing * 0.55, 0.2, 3.8),
  };
}

function simulateMatchScore(params: {
  seed: string;
  matchId: string;
  stage: MatchStage;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const rng = createRng(`${params.seed}:${params.matchId}:${params.homeTeamName}:${params.awayTeamName}`);
  const homeRank = getLatestFifaRank(params.homeTeamName) ?? 120;
  const awayRank = getLatestFifaRank(params.awayTeamName) ?? 120;
  const { home, away } = expectedGoals(homeRank, awayRank, rng() - 0.5);

  let homeScore = poisson(home, rng);
  let awayScore = poisson(away, rng);
  let homePenalties: number | null = null;
  let awayPenalties: number | null = null;

  if (params.stage !== MatchStage.GROUP && homeScore === awayScore) {
    const homePenaltyEdge = clamp(0.5 + (awayRank - homeRank) / 150, 0.35, 0.65);
    const homeWonPens = rng() < homePenaltyEdge;
    homePenalties = homeWonPens ? 4 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 3);
    awayPenalties = homeWonPens ? Math.max(0, homePenalties - (1 + Math.floor(rng() * 2))) : 4 + Math.floor(rng() * 3);
    if (!homeWonPens) {
      awayPenalties = Math.max(awayPenalties, 4);
      homePenalties = Math.min(homePenalties, awayPenalties - 1);
    }
    if (homePenalties === awayPenalties) {
      awayPenalties += 1;
    }
  }

  return { homeScore, awayScore, homePenalties, awayPenalties };
}

async function seedReadyMatches(seed: string) {
  const readyMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      simulationApplyAt: { not: null },
      simulationHomeScore: null,
      simulationAwayScore: null,
    },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: [{ kickoffAt: "asc" }, { id: "asc" }],
    take: 200,
  });

  for (const match of readyMatches) {
    if (!match.homeTeam?.name || !match.awayTeam?.name) continue;
    const simulated = simulateMatchScore({
      seed,
      matchId: match.id,
      stage: match.stage,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
    });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        simulationHomeScore: simulated.homeScore,
        simulationAwayScore: simulated.awayScore,
        simulationHomePenalties: simulated.homePenalties,
        simulationAwayPenalties: simulated.awayPenalties,
      },
    });
  }
}

async function finalizeDueMatches() {
  const now = new Date();
  const dueMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      simulationApplyAt: { lte: now },
      simulationHomeScore: { not: null },
      simulationAwayScore: { not: null },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    orderBy: [{ simulationApplyAt: "asc" }, { kickoffAt: "asc" }],
    take: 200,
  });

  for (const match of dueMatches) {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: MatchStatus.FINAL,
        homeScore: match.simulationHomeScore,
        awayScore: match.simulationAwayScore,
        homePenalties: match.simulationHomePenalties,
        awayPenalties: match.simulationAwayPenalties,
      },
    });
    await advanceFromFinalizedMatch(match.id);
  }

  return dueMatches.length;
}

export async function syncSimulatedResultsIfNeeded() {
  const config = await prisma.appConfig.findUnique({
    where: { id: 1 },
    select: { simulationEnabled: true, simulationSeed: true },
  });

  if (!config?.simulationEnabled || !config.simulationSeed) return;

  await populateRoundOf32FromGroups();
  await seedReadyMatches(config.simulationSeed);
  const appliedCount = await finalizeDueMatches();
  if (appliedCount > 0) {
    await populateRoundOf32FromGroups();
    await seedReadyMatches(config.simulationSeed);
    await recomputeAllUserScores();
  }
}

export async function clearSimulationConfig() {
  await prisma.appConfig.update({
    where: { id: 1 },
    data: {
      simulationEnabled: false,
      simulationSeed: null,
    },
  });

  await prisma.match.updateMany({
    where: {},
    data: {
      simulationApplyAt: null,
      simulationHomeScore: null,
      simulationAwayScore: null,
      simulationHomePenalties: null,
      simulationAwayPenalties: null,
    },
  });
}
