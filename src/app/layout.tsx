import type { Metadata } from "next";
import localFont from "next/font/local";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamHighlightProvider } from "@/app/components/TeamHighlightProvider";
import "./globals.css";

const robotoCondensed = localFont({
  src: "../../public/fonts/Roboto_Condensed/RobotoCondensed-VariableFont_wght.ttf",
  variable: "--font-body",
  display: "swap",
});

const bitcountGridDouble = localFont({
  src: "../../public/fonts/Bitcount_Grid_Double/BitcountGridDouble-VariableFont_CRSV,ELSH,ELXP,slnt,wght.ttf",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WC 2026 Pool",
  description: "Invite-only World Cup 2026 prediction pool — team draw & daily picks.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const highlightedTeams = user
    ? await prisma.userTeam.findMany({
        where: { userId: user.id },
        include: { team: true },
        orderBy: { team: { name: "asc" } },
        take: 100,
      })
    : [];

  return (
    <html
      lang="en"
      className={`${robotoCondensed.variable} ${bitcountGridDouble.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TeamHighlightProvider
          highlightedTeamIds={highlightedTeams.map((entry) => entry.teamId)}
          highlightedTeamNames={highlightedTeams.map((entry) => entry.team.name)}
        >
          {children}
        </TeamHighlightProvider>
      </body>
    </html>
  );
}
