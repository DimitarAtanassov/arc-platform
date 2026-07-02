import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/providers";
import { DENSITY_SCRIPT } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ARC Research Console",
    template: "%s · ARC Research Console",
  },
  description:
    "A focused console for model discovery and inference, served by a thin BFF over arc-model-lab.",
  applicationName: "ARC Research Console",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-density="comfortable"
      suppressHydrationWarning
      className={cn(inter.variable, jetBrainsMono.variable)}
    >
      <body>
        {/* Apply persisted density before paint; theme is handled by next-themes. */}
        <script dangerouslySetInnerHTML={{ __html: DENSITY_SCRIPT }} />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
