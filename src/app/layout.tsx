import type { Metadata } from "next";
import localFont from "next/font/local";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${robotoCondensed.variable} ${bitcountGridDouble.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
