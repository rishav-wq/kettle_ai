import { z } from "zod";

/*
  Every environment variable the server reads, validated once at import.
  A missing secret fails loudly at boot, not silently at 2am when a webhook arrives.
  Optional entries become required as their step lands.
*/
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /*
    MongoDB connection string, checked for scheme and for a database name.

    `z.string().url()` alone accepts anything URL-shaped, which is how a
    connection string for the wrong engine once passed validation and failed
    much later with a confusing error. Both checks here exist because both
    have already gone wrong: the scheme, and the missing database name — Atlas
    hands you a URI with no database in the path, and the driver then silently
    uses "test".
  */
  DATABASE_URL: z.string().optional(),

  /* Signs session cookies and keys the OTP hash. Required in production. */
  AUTH_SECRET: z.string().min(16).optional(),

  /*
    SMS. Without these the dev sender prints the code to the server log.

    DLT registers a template per language, so the two are separate ids. Setting
    only MSG91_TEMPLATE_ID is valid: it is used for whatever language is asked
    for, which is the right behaviour while only one template is approved.
  */
  MSG91_AUTH_KEY: z.string().min(1).optional(),
  MSG91_TEMPLATE_ID: z.string().min(1).optional(),
  MSG91_TEMPLATE_ID_EN: z.string().min(1).optional(),
  MSG91_TEMPLATE_ID_HI: z.string().min(1).optional(),
  MSG91_SENDER_ID: z.string().min(1).optional(),
  /*
    Shared secret for the delivery-report callback. MSG91 does not sign these
    the way Razorpay signs its webhooks, so the secret travels in the callback
    URL you configure in their dashboard. That is weaker than a signature — a
    URL can leak through a proxy log — which is why the endpoint only ever
    writes to an observability table and grants nothing.
  */
  MSG91_WEBHOOK_SECRET: z.string().min(16).optional(),

  /*
    MSG91 OTP widget. Both of these are sent to the browser by design — they
    are the widget's public handle — which is why they are NEXT_PUBLIC and why
    neither is enough to sign anyone in. The account-level MSG91_AUTH_KEY stays
    server-side and is what actually validates a token.
  */
  NEXT_PUBLIC_MSG91_WIDGET_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MSG91_WIDGET_TOKEN: z.string().min(1).optional(),

  /* Gold plan. Price is a product decision; these are the knobs, not the answer. */
  GOLD_PRICE_PAISE: z.coerce.number().int().positive().default(349900),
  GOLD_MONTHS: z.coerce.number().int().positive().default(12),

  /*
    Razorpay, in two sets.

    RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are the canonical pair and what a
    deployment carrying only one set should use — render.yaml describes those.
    The TEST_ and LIVE_ pairs let one machine hold both without the two ever
    being confused: src/lib/payments/keys.ts picks by NODE_ENV and refuses a
    live key outside production outright.

    Each mode has its own webhook secret, because Razorpay issues a separate
    one per webhook and the test and live dashboards are separate.
  */
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

  RAZORPAY_TEST_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_TEST_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_TEST_WEBHOOK_SECRET: z.string().min(1).optional(),

  RAZORPAY_LIVE_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_LIVE_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_LIVE_WEBHOOK_SECRET: z.string().min(1).optional(),

  /*
    A date, like 2026-10-05. Lets the deployed site run on TEST keys until then,
    so the paid flow can be walked on the real domain before real money is
    switched on. Expires on its own, the way REVIEW_UNTIL does.
  */
  RAZORPAY_TEST_MODE_UNTIL: z.string().min(1).optional(),

  /*
    Who may edit the catalogue: a comma separated list of phone numbers in
    E.164, exactly as they are stored. Unset means nobody, which is the right
    default for every environment that is not yours.

    In the environment rather than the database on purpose — see src/lib/admin.ts.
  */
  ADMIN_PHONES: z.string().optional(),

  /*
    The account a payment provider's reviewer signs in with, because
    Razorpay's form asks for a password and this product has none.

    A fixed code on a live site. Unset means it does not exist, which is
    correct everywhere except the deployment under review. REVIEW_UNTIL is
    a plain date, YYYY-MM-DD, after which it stops working by itself —
    forgetting to remove it should expire, not persist. See src/lib/auth/review.ts.
  */
  REVIEW_PHONE: z.string().optional(),
  REVIEW_CODE: z.string().optional(),
  REVIEW_UNTIL: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

/*
  A blank entry means unset, not set-to-empty.

  `KEY=` in a .env file is how you hold a slot open for a value you do not have
  yet — it is what .env.example is made of, and what you get by copying it.
  dotenv turns that into an empty string, which fails `.min(1)` and takes the
  whole app down with an invalid-environment error at boot. Stripping blanks
  first lets optional stay optional and defaults still apply.
*/
const present = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ""));

const parsed = schema.safeParse(present);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
  throw new Error(`Invalid environment:\n  ${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/**
 * The signing key, resolved on use rather than on import.
 *
 * A module-level throw would break `next build`, which evaluates every route
 * with NODE_ENV=production before secrets are necessarily in scope. Checking
 * at the point of use keeps the build honest and still refuses to serve a real
 * production request without a real key.
 */
export function getAuthSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (isProd) {
    throw new Error("AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32");
  }
  // Fixed in development so sessions survive a restart. Unreachable in production.
  return "kettle-development-only-secret-do-not-ship";
}
