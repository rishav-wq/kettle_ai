import type { Metadata } from "next";

export const SITE_NAME = "Kettle AI";
export const SITE_DESCRIPTION = "Practical AI for people over 40, taught in simple short videos. Start with four free lessons and no account.";

export function siteUrl(pathname = ""): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const base = configured || vercel || "http://localhost:3000";
  return new URL(pathname.replace(/^([^/])/, "/$1"), `${base.replace(/\/$/, "")}/`);
}

export function pageMetadata({ title, description, pathname }: { title: string; description: string; pathname: string }): Metadata {
  const url = siteUrl(pathname);
  return {
    title,
    description,
    alternates: { canonical: url.toString() },
    openGraph: {
      type: "website",
      url: url.toString(),
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_IN",
      images: [{ url: siteUrl("/brand/og-card.png").toString(), width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteUrl("/brand/og-card.png").toString()],
    },
  };
}
