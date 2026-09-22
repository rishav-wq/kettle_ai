import type { Metadata } from "next";

export const SITE_NAME = "Kettle AI";
export const SITE_DESCRIPTION = "Practical AI for people over 40, taught in simple short videos. Start with four free lessons and no account.";

/*
  The bare host, for the rare place it is shown to a reader rather than sent to
  a crawler — the mock address bar in the hero demo.

  It is derived rather than typed, because it was typed once and then the
  product moved to a different domain: the hero went on drawing a browser
  showing kettle.ai, a domain we do not own, on the landing page of a product
  whose first course teaches this audience to read the address bar before
  trusting what is under it.

  process.env.NEXT_PUBLIC_SITE_URL is a static member expression, so Next
  inlines it into the client bundle at build time and this works in a client
  component. The literal is the fallback for a build with nothing configured.
*/
export const CANONICAL_HOST = "getkettleai.com";

export function siteHost(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).host;
    } catch {
      /* Misconfigured rather than unset. Show the domain we know is ours. */
    }
  }
  return CANONICAL_HOST;
}

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
