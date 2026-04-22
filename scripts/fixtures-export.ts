import { writeFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, prisma } from "./lib/db";
import { requireArg } from "./lib/cli";

async function main() {
  const outputPath = requireArg("output");
  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(process.cwd(), outputPath);

  const matches = await prisma.match.findMany({
    orderBy: [{ stage: "asc" }, { bracketOrder: "asc" }, { kickoffAt: "asc" }],
    include: { homeTeam: true, awayTeam: true },
    take: 500,
  });

  const rows = matches.map((match) => ({
    stage: match.stage,
    groupCode: match.groupCode,
    bracketOrder: match.bracketOrder,
    homeTeamName: match.homeTeam?.name ?? null,
    awayTeamName: match.awayTeam?.name ?? null,
    kickoffAt: match.kickoffAt.toISOString(),
  }));

  await writeFile(`${absoluteOutputPath}`, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Exported ${rows.length} fixtures to ${absoluteOutputPath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
