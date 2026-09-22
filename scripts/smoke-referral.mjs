/*
  The referral programme, including the parts that must not pay out.

    npm run smoke:referral -- http://localhost:3080 <path-to-dev-log>

  npm run smoke already walks the happy path: A pays, A shares a code, B signs
  up with it, B pays, both get a month. That proves the feature works. It does
  not prove the feature cannot be farmed, which is the part that costs money.

  A referral is worth a free month to each side, so the question this asks is
  what a determined person can get for nothing. Four things must hold:

    an invented code pays nobody, and does not break the payment it arrives on
    a referred person who never pays earns their referrer nothing
    one referred person pays out once, however many times the webhook fires
    a second genuine referral does pay again, because that is the programme

  Everything runs through the ordinary endpoints with real sessions and real
  origin headers, the way scripts/smoke.mjs does. Settlement goes through
  /api/payments/simulate, which stands in for the webhook.

  It cleans up after itself: every account it makes is deleted at the end.
*/
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3080";
const LOG = process.argv[3] ?? ".dev.log";

let pass = 0;
let fail = 0;
function check(ok, label, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
  return ok;
}

/* One jar at a time, swapped between people. Same shape as scripts/smoke.mjs. */
let jar = new Map();
const snapshot = () => new Map(jar);
const restore = (m) => {
  jar = new Map(m);
};
const monthsFromNow = (iso) => (new Date(iso).getTime() - Date.now()) / (30.4 * 864e5);

async function req(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { origin: BASE } : {}),
      ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const k = pair.slice(0, i);
    const v = pair.slice(i + 1);
    if (v === "") jar.delete(k);
    else jar.set(k, v);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, text, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function codeFor(phone) {
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    let raw = "";
    try {
      raw = readFileSync(LOG, "utf8");
    } catch {
      continue;
    }
    const hits = [...raw.matchAll(/Kettle OTP for (\+\d+)[\s\S]{0,200}?code: (\d{6})/g)].filter((m) => m[1] === phone);
    if (hits.length) return hits.at(-1)[2];
  }
  throw new Error(`no code for ${phone} in ${LOG}`);
}

const newPhone = () => `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

/** Signs a fresh person in, optionally carrying a referral code, and onboards them. */
async function joinAs(name, referralCode) {
  jar = new Map();
  const phone = newPhone();
  const body = referralCode ? { phone, referralCode } : { phone };
  await req("/api/auth/otp/send", { method: "POST", body });
  const otp = await codeFor(phone);
  await req("/api/auth/otp/verify", { method: "POST", body: { phone, code: otp, name } });
  await req("/api/onboarding", { method: "POST", body: { lang: "en", categoryId: "start" } });
  return { phone, jar: snapshot() };
}

/** Buys Gold through the stand-in for the webhook. */
async function buyGold() {
  await req("/api/payments/order", { method: "POST" });
  return (await req("/api/payments/simulate", { method: "POST" })).status;
}

async function goldUntil() {
  return (await req("/api/payments/status")).json?.goldUntil ?? null;
}

async function main() {
  console.log(`referral, against ${BASE}\n`);

  /* ── A, who will do the referring ─────────────────────────────────────── */
  console.log("— a member with a code —");
  const A = await joinAs("Referrer A");
  check((await buyGold()) === 200, "A becomes a member");
  const aTermAfterJoin = await goldUntil();

  const invite = await req("/invite");
  const code = invite.text.match(/data-referral-code="([A-Z0-9]{4,12})"/)?.[1] ?? null;
  if (!check(Boolean(code), "A has a referral code", code ?? "")) process.exit(1);
  A.jar = snapshot();

  /* ── an invented code ─────────────────────────────────────────────────── */
  console.log("\n— a code nobody owns —");
  const fake = "ZZ9Q7X";
  check((await req(`/i/${fake}`)).status === 307, "the landing page for an unknown code redirects home");

  const C = await joinAs("Unknown code C", fake);
  check((await buyGold()) === 200, "someone who used it can still pay");
  const cTerm = await goldUntil();
  check(Math.abs(monthsFromNow(cTerm) - 12) < 0.5, "and gets the plain term, with no bonus", `(${monthsFromNow(cTerm).toFixed(1)} mo)`);

  restore(A.jar);
  const aAfterFake = await goldUntil();
  check(aAfterFake === aTermAfterJoin, "A's term did not move for a code that was not A's");

  /* ── a referred person who never pays ─────────────────────────────────── */
  console.log("\n— a referral who never pays —");
  const D = await joinAs("Never pays D", code);
  check((await req("/api/payments/status")).json?.state === "free", "D signed up with A's code and stayed free");

  restore(A.jar);
  check((await goldUntil()) === aTermAfterJoin, "A earned nothing for a signup alone");

  /* ── the real thing, and only once ────────────────────────────────────── */
  console.log("\n— a referral who pays —");
  const B = await joinAs("Pays B", code);
  check((await buyGold()) === 200, "B pays");
  const bTerm = await goldUntil();
  check(monthsFromNow(bTerm) > 12.5, "B got the bonus month", `(${monthsFromNow(bTerm).toFixed(1)} mo)`);

  /* The webhook is retried in the real world; the payout must not be. */
  await req("/api/payments/simulate", { method: "POST" });
  await req("/api/payments/simulate", { method: "POST" });
  check((await goldUntil()) === bTerm, "B's term is unchanged after two more webhooks");
  B.jar = snapshot();

  restore(A.jar);
  const aAfterB = await goldUntil();
  check(monthsFromNow(aAfterB) > monthsFromNow(aTermAfterJoin) + 0.5, "A got a month too", `(${monthsFromNow(aAfterB).toFixed(1)} mo)`);
  A.jar = snapshot();

  /* ── a second genuine referral pays again ─────────────────────────────── */
  console.log("\n— a second referral —");
  const E = await joinAs("Pays E", code);
  check((await buyGold()) === 200, "E pays");
  E.jar = snapshot();

  restore(A.jar);
  const aAfterE = await goldUntil();
  check(
    monthsFromNow(aAfterE) > monthsFromNow(aAfterB) + 0.5,
    "A got a second month, because that is the programme",
    `(${monthsFromNow(aAfterE).toFixed(1)} mo)`
  );

  /* ── tidy up ──────────────────────────────────────────────────────────── */
  console.log("\n— cleaning up —");
  let removed = 0;
  for (const who of [A, B, C, D, E]) {
    restore(who.jar ?? new Map());
    if ((await req("/api/account", { method: "DELETE" })).status === 200) removed++;
  }
  check(removed === 5, "every account it made is deleted", `${removed} of 5`);

  console.log(`\n${fail === 0 ? "All referral checks passed." : `${fail} FAILED, ${pass} passed.`}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
