import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";

/*
  Poppins throughout. The interface is English only, so the Devanagari faces
  the earlier design carried are gone. Lesson titles and transcripts may still
  contain Hindi words, and Poppins has no Devanagari, so the fallback stack
  ends at the platform's own Indic face rather than at a box.
*/
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07150f" },
  ],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
