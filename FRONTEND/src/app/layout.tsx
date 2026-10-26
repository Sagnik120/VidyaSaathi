import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif, Kalam, Noto_Sans_Devanagari, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { InkCursor } from "@/components/layout/ink-cursor";
import { PageLoader } from "@/components/brand/page-loader";
import { HelpBot } from "@/components/layout/help-bot";

const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display-latin" });
// Devanagari faces load only when Hindi text appears (not preloaded for every visitor).
const displayDeva = Tiro_Devanagari_Hindi({ subsets: ["devanagari"], weight: "400", variable: "--font-display-deva", preload: false, display: "swap" });
const ui = Figtree({ subsets: ["latin"], variable: "--font-ui-latin" });
const uiDeva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-ui-deva", preload: false, display: "swap" });
const hand = Kalam({ subsets: ["latin", "devanagari"], weight: ["300", "400", "700"], variable: "--font-kalam" });

export const metadata: Metadata = {
  title: { default: "VidyaSaathi — adaptive learning for Classes 6–10", template: "%s · VidyaSaathi" },
  description:
    "Adaptive learning for Indian students in Classes 6–10 (CBSE & ICSE): your syllabus as a learning path, video lessons that check you understood, instant doubt-solving, teacher support, tests, games and simulations. English & हिन्दी.",
  icons: {
    // The VidyaSaathi logo lives in the browser tab; inside the site the paper plane is the mark.
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.png", sizes: "64x64", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${displayDeva.variable} ${ui.variable} ${uiDeva.variable} ${hand.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-paper font-sans text-ink antialiased">
        <AppProviders>
          <PageLoader />
          <InkCursor />
          {children}
          <HelpBot />
        </AppProviders>
      </body>
    </html>
  );
}
