import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { request } from "node:https";
import { DEFAULT_TEAMS } from "./lib/default-teams";
import { FIFA_MEN_RANKING_CODES } from "./lib/fifa-men-ranking-codes";

type RankingSnapshot = {
  source: string;
  officialUpdate: string;
  fetchedAt: string;
  teams: Record<string, { fifaCode: string; rank: number }>;
};

function fetchText(url: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const req = request(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        resolvePromise(body);
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function extractCurrentRank(html: string, teamName: string): number {
  const rankMatch = html.match(/Highlights<\/div><div class="highlights_container__[^"]+"><div class="highlights_resultItemWrapper__[^"]+"><div class="highlights_resultItemValue__[^"]+"><span class="">(\d+)(?:st|nd|rd|th)<\/span><\/div><div class="highlights_resultItemLabel__[^"]+"><span>Current rank<\/span>/);
  if (!rankMatch) {
    throw new Error(`Could not extract current rank for ${teamName}`);
  }

  return Number(rankMatch[1]);
}

async function main() {
  const teams = [...DEFAULT_TEAMS]
    .map((team) => ({
      name: team.name,
      fifaCode: FIFA_MEN_RANKING_CODES[team.name],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const missingCodes = teams.filter((team) => !team.fifaCode);
  if (missingCodes.length > 0) {
    throw new Error(`Missing FIFA code mapping for: ${missingCodes.map((team) => team.name).join(", ")}`);
  }

  const rankingEntries = await Promise.all(
    teams.map(async (team) => {
      const url = `https://inside.fifa.com/en/fifa-world-ranking/${team.fifaCode}?gender=men`;
      const html = await fetchText(url);
      return [
        team.name,
        {
          fifaCode: team.fifaCode,
          rank: extractCurrentRank(html, team.name),
        },
      ] as const;
    }),
  );

  const snapshot: RankingSnapshot = {
    source: "https://inside.fifa.com/en/fifa-world-ranking/men?gsid=395d49c1-864f-4095-a733-1644d5dd1731",
    officialUpdate: "2026-04-01",
    fetchedAt: new Date().toISOString(),
    teams: Object.fromEntries(rankingEntries),
  };

  const outputPath = resolve("src/generated/fifa-men-rankings.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Wrote ${rankingEntries.length} FIFA rankings to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
