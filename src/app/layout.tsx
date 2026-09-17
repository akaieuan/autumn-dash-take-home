import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cookies } from "next/headers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SIDEBAR_COOKIE, parseSidebarState } from "@/lib/sidebar";
import { AppFrame } from "@/components/layout";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Harbor House Inn · Autumn",
  description: "Is Autumn helping your hotel get more direct bookings and revenue?",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sidebar = parseSidebarState((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Sets .dark before first paint; see src/lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider delayDuration={150}>
          <AppFrame sidebar={sidebar}>{children}</AppFrame>
        </TooltipProvider>
      </body>
    </html>
  );
}
