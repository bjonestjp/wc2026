import { readFile } from "node:fs/promises";
import path from "node:path";
import { MatchStage } from "@prisma/client";

export type FixtureFileRow = {
  stage: MatchStage;
  groupCode?: string | null;
  bracketOrder?: number | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  kickoffAt?: string | null;
};

export type ResultFileRow = {
  stage: MatchStage;
  groupCode?: string | null;
  bracketOrder?: number | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeScore: number;
  awayScore: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
};

export type TriviaFileRow = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: number;
};

export async function readJsonFile<T>(inputPath: string): Promise<T> {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(process.cwd(), inputPath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}
