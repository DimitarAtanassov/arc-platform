import type { AppProps } from "next/app";
import Head from "next/head";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

import "@/styles/tokens.css";
import "@/styles/globals.css";
import { PrefsProvider } from "@/lib/prefs";

// Typography: a high-contrast apothecary-label serif for headings, a precise
// grotesque for UI, and a real monospace for IDs/durations/JSON (mandatory for
// an OTel tool). Self-hosted via next/font — no runtime network fetch.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
// Variable font: omit `weight` so any CSS weight (e.g. 460/520) resolves on the
// wght axis. opsz/SOFT add the apothecary-label optical character.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ARC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="ARC — observability and evaluation for AI systems, built on OpenTelemetry."
        />
      </Head>
      <div className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
        <PrefsProvider>
          <Component {...pageProps} />
        </PrefsProvider>
      </div>
    </>
  );
}
