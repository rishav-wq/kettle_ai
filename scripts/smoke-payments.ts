/*
  The paid path, against Razorpay's real test API.

    npm run smoke:payments -- http://localhost:3000 <path-to-dev-log>

  npm run smoke covers this with /api/payments/simulate, which stands in for
  the webhook while no keys exist. That proves the plumbing downstream of the
  webhook and nothing upstream of it: not that an order can actually be created
  at Razorpay, and not that a real signature verifies. Those two are where the
  money is.

  So this creates a genuine order through the test credentials, then posts a
  webhook signed the way Razorpay signs one — HMAC-SHA256 over the exact bytes,
  keyed by the webhook secret. No tunnel and no public URL: the signature is
  the whole of the proof, so it can be produced locally.

  It also probes what must fail. A forged signature must not grant anything, a
  replay must not extend the membership a second time, and an order for one
  account must not settle onto another.

  Test mode only, by construction. src/lib/payments/keys.ts refuses a live key
  outside production, so this cannot touch real money even if pointed at the
  wrong environment.
*/
import "./load-env";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { getClient, getDb } from "../src/lib/db/mongo";
import { razorpayConfigured, razorpayKeys, razorpayMode, razorpayWebhookSecret } from "../src/lib/payments/keys";

const BASE = process.argv[2] ?? "http://localhost:3000";
const LOG = process.argv[3];

const jar = new Map<string, string>();
let pass = 0;
let fail = 0;
const check = (ok: boolean, label: string, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
};

type Res = { status: number; text: string; json: Record<string, unknown> | null };

async function req(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string>; fresh?: boolean } = {}): Promise<Res> {
  const { method = "GET", body, headers: extra = {}, fresh = false } = opts;
  const headers: Record<string, string> = { origin: BASE, host: new URL(BASE).host, ...extra };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!fresh && jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* not json */
  }
  return { status: res.status, text, json };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function codeFor(phone: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    let raw = "";
    try {
      raw = readFileSync(LOG, "utf8");
    } catch {
      continue;
    }
    const hits = [...raw.matchAll(/Kettle OTP for (\+\d+)[\s\S]{0,200}?code: (\d{6})/g)].filter((m) => m[1] === phone);
    if (hits.length) return hits.at(-1)![2];
  }
  throw new Error(`no code for ${phone} in ${LOG}`);
}

/** A payment.captured body shaped the way Razorpay shapes one, signed the way it signs. */
function signedWebhook(orderId: string, secret: string, event = "payment.captured") {
  const raw = JSON.stringify({
    event,
    payload: { payment: { entity: { id: `pay_smoke_${Date.now()}`, order_id: orderId, amount: 349900 } } },
  });
  return { raw, signature: createHmac("sha256", secret).update(raw).digest("hex") };
}

async function main() {
  if (!razorpayConfigured) {
    console.log("Razorpay test keys are not configured, so there is nothing to test here.");
    console.log("Set RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET, then run this again.");
    process.exit(1);
  }
  if (razorpayMode !== "test") {
    console.log(`Refusing: mode is "${razorpayMode}". This creates real orders and must only run against test keys.`);
    process.exit(1);
  }
  const secret = razorpayWebhookSecret();
  if (!secret) {
    console.log("No webhook secret for test mode. Set RAZORPAY_TEST_WEBHOOK_SECRET to the one Razorpay shows when you add the webhook.");
    process.exit(1);
  }
  console.log(`mode: ${razorpayMode}, key …${razorpayKeys().keyId.slice(-4)}\n`);

  const phone = `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

  console.log("— a learner signs in —");
  check((await req("/api/auth/otp/send", { method: "POST", body: { phone } })).status === 200, "code requested");
  const code = await codeFor(phone);
  check(
    (await req("/api/auth/otp/verify", { method: "POST", body: { phone, code, name: "Payment Test" } })).status === 200,
    "signed in"
  );
  await req("/api/onboarding", { method: "POST", body: { lang: "en", categoryId: "start" } });
  check((await req("/api/payments/status")).json?.state === "free", "and starts as a free viewer");

  console.log("\n— a real order at Razorpay —");
  const order = await req("/api/payments/order", { method: "POST" });
  check(order.status === 200, "the order endpoint answers", `→ ${order.status}`);
  const orderId = String(order.json?.orderId ?? "");
  check(orderId.startsWith("order_"), "Razorpay returned a real order id", `→ ${orderId}`);
  check(order.json?.simulated !== true, "and it is not the simulated stand-in");
  check(order.json?.amountPaise === 349900, "for the configured amount", `→ ${order.json?.amountPaise}`);

  /*
    The order id must belong to the account whose key checkout will be opened
    with. These can diverge, and when they do nothing here notices: the order
    endpoint answers 200 with a perfectly well formed id, and the failure shows
    up only inside Razorpay's hosted sheet as a generic "something went wrong"
    that names neither the key nor the order.

    That happened for real. An unsettled order created against the test keys
    was reused after the switch to live, because the receipt that de-duplicates
    orders did not include the key id. The reuse path returns before writing a
    payment row, so there was no new row to find and nothing in the log.

    Asking Razorpay whether it knows this order, using the same credentials the
    browser is about to be handed, is the cheapest way to catch it.
  */
  const { keyId: checkoutKey, keySecret } = razorpayKeys();
  const lookup = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { authorization: `Basic ${Buffer.from(`${checkoutKey}:${keySecret}`).toString("base64")}` },
  });
  check(lookup.status === 200, "and Razorpay knows it under the key checkout will use", `→ HTTP ${lookup.status}`);
  check(order.json?.keyId === checkoutKey, "the key handed to the browser is the one that made the order");

  console.log("\n— what must not grant anything —");
  const forged = await req("/api/webhooks/razorpay", {
    method: "POST",
    body: signedWebhook(orderId, "not-the-secret").raw,
    headers: { "x-razorpay-signature": "deadbeef" },
  });
  check(forged.status === 401, "a forged signature is refused", `→ ${forged.status}`);
  check((await req("/api/payments/status")).json?.state === "free", "and the viewer is still free");

  const wrongKey = signedWebhook(orderId, "a-plausible-but-wrong-secret");
  const wrongSigned = await req("/api/webhooks/razorpay", {
    method: "POST",
    body: wrongKey.raw,
    headers: { "x-razorpay-signature": wrongKey.signature },
  });
  check(wrongSigned.status === 401, "a well-formed signature from the wrong secret is refused", `→ ${wrongSigned.status}`);

  console.log("\n— the real webhook —");
  const real = signedWebhook(orderId, secret);
  const delivered = await req("/api/webhooks/razorpay", {
    method: "POST",
    body: real.raw,
    headers: { "x-razorpay-signature": real.signature },
  });
  check(delivered.status === 200, "a correctly signed webhook is accepted", `→ ${delivered.status}`);

  const afterPay = await req("/api/payments/status");
  check(afterPay.json?.state === "gold", "the viewer is now gold", `→ ${afterPay.json?.state}`);
  const until = afterPay.json?.goldUntil ? new Date(String(afterPay.json.goldUntil)) : null;
  const months = until ? (until.getTime() - Date.now()) / (30.4 * 864e5) : 0;
  check(months > 11 && months < 13, "with the twelve month term", `→ ${months.toFixed(1)} mo`);

  console.log("\n— and it only counts once —");
  const replay = await req("/api/webhooks/razorpay", {
    method: "POST",
    body: real.raw,
    headers: { "x-razorpay-signature": real.signature },
  });
  check(replay.status === 200, "a retry is accepted rather than errored", `→ ${replay.status}`);
  check(replay.json?.idempotent === true, "and reports itself a no-op");
  const afterReplay = await req("/api/payments/status");
  const months2 = afterReplay.json?.goldUntil ? (new Date(String(afterReplay.json.goldUntil)).getTime() - Date.now()) / (30.4 * 864e5) : 0;
  check(Math.abs(months2 - months) < 0.01, "the term did not move", `→ ${months2.toFixed(1)} mo`);

  console.log("\n— and the lock is actually gone —");
  const db = await getDb();
  const paidLesson = await db.collection("lessons").findOne({ isFree: { $ne: true }, isPublished: true });
  if (paidLesson) {
    const page = await req(`/lessons/${paidLesson.id}`);
    check(!page.text.includes("This lesson is for Gold members"), "a paid lesson opens", `→ ${paidLesson.id}`);
  } else {
    console.log("WARN: no published paid lesson to check the lock against");
  }

  console.log("\n— cleaning up —");
  check((await req("/api/account", { method: "DELETE" })).status === 200, "the test account is removed");

  console.log(`\n${fail === 0 ? "All payment checks passed." : `${fail} FAILED, ${pass} passed.`}`);
  await (await getClient()).close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
