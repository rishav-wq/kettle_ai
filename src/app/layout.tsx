import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";
import { getLang } from "@/lib/lang";
import { LangProvider } from "@/components/lang-provider";

/*
  Two faces, because the interface is bilingual again.

  Poppins has no Devanagari at all, so Hindi set in it falls through to
  whatever Indic face the phone happens to carry — which on a cheap Android is
  a different weight, a different x-height, and visibly a different typeface
  mid-sentence. Anek Devanagari carries both scripts, so a Hinglish line like
  "Resume बनाइए" renders in one family instead of colliding two.

  Anek is loaded for both scripts and applied when the interface is Hindi;
  Poppins stays the Latin face for English.
*/
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const anek = Anek_Devanagari({
  variable: "--font-devanagari",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl("/"),
  title: { default: "Kettle AI | Practical AI lessons for everyday life", template: "%s · Kettle AI" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: siteUrl("/").toString() },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kettle", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    url: siteUrl("/").toString(),
    siteName: SITE_NAME,
    title: "Kettle AI | Practical AI lessons for everyday life",
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    images: [{ url: "/brand/og-card.png", width: 1200, height: 630, alt: "Kettle" }],
  },
  twitter: { card: "summary_large_image", title: "Kettle AI | Practical AI lessons for everyday life", description: SITE_DESCRIPTION, images: [siteUrl("/brand/og-card.png").toString()] },
};

export const viewport: Viewport = {
  /*
    One colour, and it is the light one.

    This used to answer prefers-color-scheme, which made the browser's own strip
    above the page go near-black on any phone set to dark mode — while the page
    under it stayed white, because the stylesheet deliberately does not follow
    that query. Night here is opt-in, set by the Night chip, and a phone being
    in dark mode is not the same thing as a reader asking for a dark screen on a
    cheap display in daylight.

    So the two disagreed, and the black strip was the first thing on screen. The
    chip keeps this in step at runtime — see syncThemeColor in
    src/components/ui/comfort-chips.tsx — which a media query cannot do, since
    it cannot see data-theme.
  */
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/*
  Applies saved reading preferences before first paint, so the page never
  flashes the wrong text size or theme. Runs once, inline, no framework.
*/
const prefsScript = `
try {
  var p = JSON.parse(localStorage.getItem("kettle.prefs") || "{}");
  var r = document.documentElement;
  if (p.theme === "dark" || p.theme === "light") r.setAttribute("data-theme", p.theme);
  if (p.textsize === "big") r.setAttribute("data-textsize", "big");
} catch (e) {}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
    The lang attribute is the switch. Every bilingual string renders both
    languages and CSS hides one based on this, so the page arrives already in
    the right language rather than being corrected after hydration.
  */
  const lang = await getLang();

  return (
    <html lang={lang} suppressHydrationWarning className={`${poppins.variable} ${anek.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-full">
        {/* Only the handful of attribute strings need this; everything else
            switches in CSS off the lang above. */}
        <LangProvider lang={lang}>{children}</LangProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
