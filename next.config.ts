import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
  Content Security Policy.
  Allows exactly what the product uses: our own origin, YouTube's no-cookie
  player, Razorpay checkout, the MSG91 OTP widget, and the observability hosts.
  Everything else is blocked. 'unsafe-inline' for scripts is the one
  compromise; a nonce-based policy is a v1 hardening item once the page set is
  stable.

  verify.msg91.com is third-party JavaScript on the sign-in page, which is the
  highest-value target in the product — it is where phone numbers and codes are
  typed. It earns its place because the widget sends and verifies the code, but
  it is worth remembering that it is there: a compromise of that host is a
  compromise of sign-in. Nothing it reports is trusted on its own; the server
  re-verifies every token against MSG91's API before a session exists.
*/
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://verify.msg91.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://i.ytimg.com https://*.razorpay.com",
  "media-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://api.razorpay.com https://checkout.razorpay.com",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://control.msg91.com https://verify.msg91.com https://*.posthog.com https://*.sentry.io https://*.ingest.sentry.io",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone stays available to self for the voice-ask feature later. Everything else is off.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(self), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // PGlite ships WASM and must not be bundled into the server build.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // Course photographs come from our own storage or YouTube thumbnails. Nothing else.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  /*
    Courses are gone; lessons hang off a category directly. Anything that
    linked to a course page — the old sitemap, a shared link — lands on the
    catalogue rather than a 404. A slug-to-category map would be more precise
    but would have to be maintained by hand forever, for URLs that were live
    for about a week.
  */
  async redirects() {
    /*
      Slug-shaped segments only. ":slug*" also matched /courses/foo.svg, which
      is where the placeholder art used to live — so every lesson without a
      video answered 308 and rendered a blank card. The art has moved to
      /art/, so they no longer collide at all; this keeps the redirect narrow
      anyway, because the next thing put under a public directory should not
      be able to disappear this way.
    */
    return [{ source: "/courses/:slug([a-z0-9-]+)", destination: "/learn", permanent: true }];
  },
};

export default nextConfig;
