import type { Metadata, Viewport } from "next";
import { Newsreader, Manrope, IBM_Plex_Mono, Heebo } from "next/font/google";
import "./globals.css";
import { getLocale, isRtl } from "@/lib/i18n/locale";
import { LanguageToggle } from "@/components/nav/LanguageToggle";

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"]
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"]
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

// Manrope/Newsreader are Latin-only subsets, so they render Hebrew as
// tofu/fallback boxes. Heebo is a Hebrew-native Google Font that also covers
// Latin, loaded as a fallback that kicks in under dir="rtl" (see
// globals.css) rather than replacing the Latin fonts everywhere.
const hebrew = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-hebrew",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Family Travel OS",
  description: "Your itinerary, brought to life.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Family Travel OS" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1c2340",
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const rtl = isRtl(locale);

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"} className={`${display.variable} ${body.variable} ${mono.variable} ${hebrew.variable}`}>
      <body className="safe-top safe-bottom antialiased">
        <LanguageToggle locale={locale} />
        {children}
      </body>
    </html>
  );
}
