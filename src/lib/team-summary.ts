export type TeamFormToken = "W" | "L" | "D" | "-";

export type TeamSummary = {
  teamId: string;
  teamName: string;
  assignedPlayers: string[];
  form: TeamFormToken[];
  goalsScored: number;
};
