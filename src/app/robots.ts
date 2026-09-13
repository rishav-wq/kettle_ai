import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing personal, and nothing that only makes sense mid-flow.
      disallow: ["/api/", "/account", "/mine", "/onboarding", "/signin", "/gold/success", "/i/", "/kit"],
    },
    sitemap: `${base()}/sitemap.xml`,
  };
}

export function base(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
