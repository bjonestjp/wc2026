"use client";

import { createContext, useContext } from "react";

type TeamHighlightContextValue = {
  highlightedTeamIds: string[];
  highlightedTeamNames: string[];
};

const TeamHighlightContext = createContext<TeamHighlightContextValue>({
  highlightedTeamIds: [],
  highlightedTeamNames: [],
});

export function TeamHighlightProvider({
  children,
  highlightedTeamIds,
  highlightedTeamNames,
}: React.PropsWithChildren<TeamHighlightContextValue>) {
  return (
    <TeamHighlightContext.Provider
      value={{ highlightedTeamIds, highlightedTeamNames }}
    >
      {children}
    </TeamHighlightContext.Provider>
  );
}

export function useTeamHighlight() {
  return useContext(TeamHighlightContext);
}
