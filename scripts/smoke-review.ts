/*
  The review account: does it work, and does it weaken anything?

    REVIEW_PHONE=+919000000111 REVIEW_CODE=424242 REVIEW_UNTIL=2099-01-01 npm run dev
    npm run smoke:review -- http://localhost:3000

  The first half is the part Razorpay needs: the nominated number signs in with
  a code that does not change, and no SMS is involved.

  The second half is the part that matters more. A fixed credential on a live
  site is only acceptable if it is narrow, so this proves the narrowness: the
  code works for no other number, other numbers still need a real one, single
  use and the attempt cap still apply to the review phone, and the account it
  creates is an ordinary free viewer with no membership and no editor access.

  It clears its own rate-limit rows first. The review phone is fixed by
  configuration, so unlike the other suites it cannot pick a fresh number each
  run, and a previous run's attempts would otherwise answer 429 and look like
  a failure of the thing being tested.
*/
import "./load-env";
import { getDb, getClient } from "../src/lib/db/mongo";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PHONE = process.argv[3] ?? "+919000000111";
const CODE = process.argv[4] ?? "424242";

const jar = new Map<string, string>();
let pass = 0;
let fail = 0;
const check = (ok: boolean, label: string, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
};

type Res = { status: number; text: string; json: Record<string, unknown> | null };

async function req(path: string, opts: { method?: string; body?: unknown; fresh?: boolean } = {}): Promise<Res> {
  const { method = "GET", body, fresh = false } = opts;
  const headers: Record<string, string> = { origin: BASE, host: new URL(BASE).host };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!fresh && jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

async function resetLimits() {
  const db = await getDb();
  const removed = await db.collection("rate_limits").deleteMany({
    key: { $in: [`otp-send:${PHONE}`, `otp-verify:${PHONE}`] },
  });
  await db.collection("otp_challenges").deleteMany({ phone: PHONE });
  console.log(`cleared ${removed.deletedCount} rate-limit row(s) and any live challenge for ${PHONE}\n`);
}

async function main() {
  await resetLimits();

  const other = `+9195${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

  console.log("— the reviewer signs in —");
  check((await req("/api/auth/otp/send", { method: "POST", body: { phone: PHONE } })).status === 200, "a code is requested for the review phone");
  const signedIn = await req("/api/auth/otp/verify", { method: "POST", body: { phone: PHONE, code: CODE, name: "Razorpay Review" } });
  check(signedIn.status === 200, "the fixed code signs in", `→ ${signedIn.status}`);
  check(jar.size > 0, "and a session cookie was set");

  const state = await req("/api/payments/status");
  check(state.json?.state === "free", "the account is an ordinary free viewer", `→ ${state.json?.state}`);
  check((await req("/admin")).status === 404, "and cannot reach the catalogue editor");
  check(
    (await req("/api/admin/categories", { method: "POST", body: { id: "x", nameHi: "x", nameEn: "x", sortOrder: 1 } })).status === 403,
    "nor write to it"
  );

  console.log("\n— it grants nothing to anyone else —");
  check((await req("/api/auth/otp/send", { method: "POST", body: { phone: other }, fresh: true })).status === 200, "another number can still request a code");
  const stolen = await req("/api/auth/otp/verify", { method: "POST", body: { phone: other, code: CODE, name: "Mallory" }, fresh: true });
  check(stolen.status !== 200, "but the review code does not work for it", `→ ${stolen.status}`);
  check(!stolen.text.includes("kettle_session"), "and no session is issued");

  console.log("\n— the ordinary protections still apply to it —");
  // The challenge was consumed by the successful sign-in, so the same code
  // must now fail: single use is not waived for this account.
  const replay = await req("/api/auth/otp/verify", { method: "POST", body: { phone: PHONE, code: CODE, name: "Again" }, fresh: true });
  check(replay.status !== 200, "the code cannot be replayed without a fresh challenge", `→ ${replay.status}`);

  await req("/api/auth/otp/send", { method: "POST", body: { phone: PHONE }, fresh: true });
  let capped = false;
  for (let i = 0; i < 8; i++) {
    const r = await req("/api/auth/otp/verify", { method: "POST", body: { phone: PHONE, code: "000000", name: "Guess" }, fresh: true });
    if (r.status === 429) {
      capped = true;
      break;
    }
  }
  check(capped, "wrong guesses against the review phone are still rate limited");

  // Leave nothing behind: the account, and the limits this run consumed.
  const cleanup = await req("/api/account", { method: "DELETE" });
  console.log(`\ncleanup: review account removed (${cleanup.status})`);
  await resetLimits();

  console.log(fail === 0 ? "All review-account checks passed." : `${fail} FAILED, ${pass} passed.`);
  await (await getClient()).close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
