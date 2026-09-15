/*
  Walks the whole product against a running dev server, as a real browser would:
  same-origin headers, a cookie jar, and nothing privileged.

    node scripts/smoke.mjs http://localhost:3080

  It signs a user in with the code printed by the dev SMS sender, finishes
  onboarding, watches the four free lessons, checks that the fifth is refused,
  pays, and confirms the paywall is gone. It also probes the things that should
  fail: a forged webhook, a cross-origin write, an unauthenticated write, and
  every way into the catalogue editor from an account that is not an admin.
*/
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3080";
const LOG = process.argv[3];
const jar = new Map();
const snapshot = () => new Map(jar);
const restore = (m) => { jar.clear(); for (const [k, v] of m) jar.set(k, v); };
const monthsFromNow = (iso) => (new Date(iso).getTime() - Date.now()) / (30.4 * 864e5);

/*
  Both of these used to be typed into this file, and both went stale the moment
  the product changed: the free lessons moved when the categories were
  restructured, and the term changed when the price did. Neither failure was a
  bug in the product, which is the worst kind of failing check. Read them from
  the same places the product reads them.
*/
const content = JSON.parse(readFileSync(new URL("../content/kettle-content.json", import.meta.url), "utf8"));
const allLessons = content.courses.flatMap((c) => c.lessons.map((l) => ({ ...l, courseId: c.id })));
const freeIds = allLessons.filter((l) => l.isFree).map((l) => l.id);
const lockedLesson = allLessons.find((l) => !l.isFree);

/** GOLD_MONTHS, from the environment or the default in src/lib/env.ts. */
const goldMonths = (() => {
  for (const file of [".env.local", ".env"]) {
    try {
      const m = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").match(/^GOLD_MONTHS\s*=\s*(\d+)/m);
      if (m) return Number(m[1]);
    } catch {
      /* not present */
    }
  }
  return 12;
})();
let pass = 0;
let fail = 0;

function check(ok, label, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
  return ok;
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(path, { method = "GET", body, origin = BASE, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { origin } : {}),
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const k = pair.slice(0, i);
    const v = pair.slice(i + 1);
    if (v === "" ) jar.delete(k); else jar.set(k, v);
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json, location: res.headers.get("location") };
}

/*
  The code the dev SMS sender printed for this phone.

  It waits for the phone to appear rather than reading once. Next's own dev log
  is written with a buffer, so a read taken the instant the send returns can
  miss the line — and the old version then fell back to whatever `code:` came
  earlier in the file, handing the verify step a stale code that belonged to
  someone else. Keyed on the phone, so a miss returns null instead of a wrong
  answer that looks like a right one.
*/
async function codeFromLog(phone, timeoutMs = 5000) {
  if (!LOG) return null;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const content = readFileSync(LOG, "utf8");
    if (content.includes(phone)) {
      const tail = content.split(phone).pop() ?? "";
      const code = tail.match(/code:\s*(\d{6})/)?.[1];
      if (code) return code;
    }
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
}

const phone = `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

console.log(`\n— public pages —`);
for (const p of ["/", "/learn", "/gold", "/help", "/legal/privacy", "/legal/terms", "/legal/refunds", "/legal/contact", "/offline", "/robots.txt", "/sitemap.xml"]) {
  const r = await req(p);
  check(r.status === 200, `GET ${p}`, `→ ${r.status}`);
}
check((await req("/lessons/does-not-exist")).status === 404, "unknown lesson is 404");
check((await req("/i/NOPE99")).status === 307, "unknown referral code redirects home");

console.log(`\n— things that must be refused —`);
check((await req("/api/progress", { method: "POST", body: { lessonId: "talk-to-ai-1", positionSec: 10 } })).status === 401, "progress without a session is 401");
check((await req("/api/account", { method: "DELETE" })).status === 401, "account deletion without a session is 401");
check((await req("/api/auth/otp/send", { method: "POST", body: { phone }, origin: "https://evil.example" })).status === 403, "cross-origin OTP send is 403");
check((await req("/api/webhooks/razorpay", { method: "POST", body: { event: "payment.captured" }, headers: { "x-razorpay-signature": "deadbeef" } })).status !== 200, "unsigned webhook is refused");
// MSG91 does not sign its delivery reports, so a shared secret in the URL is
// the whole proof. Without it the endpoint must refuse, whether or not a
// secret is configured on this server.
check((await req("/api/webhooks/msg91", { method: "POST", body: { requestId: "x", status: "delivered" } })).status !== 200, "a delivery report with no token is refused");
check((await req("/api/webhooks/msg91?token=wrong", { method: "POST", body: { requestId: "x", status: "delivered" } })).status !== 200, "a delivery report with a wrong token is refused");
// The widget hands the browser a token. A forged one must not become a session,
// and the endpoint must never accept a phone number from the caller: it learns
// the number from MSG91 or it refuses.
const forged = await req("/api/auth/widget/verify", { method: "POST", body: { accessToken: "forged.jwt.value", name: "Mallory" } });
check(forged.status !== 200, "a forged widget token is refused", `→ ${forged.status}`);
check(!forged.text.includes("kettle_session"), "a forged widget token sets no session");
check((await req("/api/payments/order", { method: "POST" })).status === 401, "order without a session is 401");
const badPhone = await req("/api/auth/otp/send", { method: "POST", body: { phone: "12345" } });
check(badPhone.status === 400, "malformed phone is rejected by the validator");

console.log(`\n— sign in —`);
const sent = await req("/api/auth/otp/send", { method: "POST", body: { phone, lang: "hi" } });
check(sent.status === 200, "OTP send accepted");
const code = await codeFromLog(phone);
if (!check(Boolean(code), "code found in the dev server log", code ? "" : "(pass the log path as argv[3])")) process.exit(1);

// An immediate resend must be refused, and must not replace the live code.
// Every SMS costs money and lands on a real handset, so the burst is capped
// on the server rather than only by the countdown on the sign-in screen.
const resend = await req("/api/auth/otp/send", { method: "POST", body: { phone, lang: "hi" } });
check(resend.status === 429, "an immediate resend is refused", `→ ${resend.status}`);
check(Number(resend.json?.retryAfterSec) > 0, "the refusal says how long to wait", `${resend.json?.retryAfterSec}s`);
check((await codeFromLog(phone)) === code, "the refused resend left the live code alone");

check((await req("/api/auth/otp/verify", { method: "POST", body: { phone, code: "000000", name: "Sunita" } })).status === 401, "a wrong code is refused");
const verified = await req("/api/auth/otp/verify", { method: "POST", body: { phone, code, name: "Sunita", lang: "hi", whatsappOptIn: true } });
check(verified.status === 200 && verified.json?.isNew === true, "correct code creates the account");
check(jar.size > 0, "a session cookie was set");
check((await req("/api/auth/otp/verify", { method: "POST", body: { phone, code, name: "Sunita" } })).status === 401, "the same code cannot be reused");

console.log(`\n— onboarding —`);
check((await req("/onboarding")).status === 200, "onboarding renders for a new account");
check((await req("/api/onboarding", { method: "POST", body: { lang: "hi", categoryId: "start" } })).status === 200, "onboarding saves");
const afterOnboard = await req("/");
check(afterOnboard.status === 307 && afterOnboard.location?.endsWith("/learn"), "landing now redirects a signed-in user to Learn");

console.log(`\n— the four free lessons —`);
check(freeIds.length === 4, "exactly four lessons are free", `→ ${freeIds.length}`);
for (const [i, id] of freeIds.entries()) {
  const r = await req("/api/progress", { method: "POST", body: { lessonId: id, positionSec: 9999 } });
  const hit = r.json?.hitFreeLimit;
  check(r.status === 200 && r.json?.completed === true, `lesson ${i + 1} completes`, `watched=${r.json?.freeWatched}`);
  if (i === freeIds.length - 1) check(hit === true, "the last free completion trips the free limit");
  else check(hit === false, `limit not tripped after ${i + 1}`);
}
check(
  (await req("/api/progress", { method: "POST", body: { lessonId: lockedLesson.id, positionSec: 60 } })).status === 403,
  "a paid lesson is refused after the limit",
  `→ ${lockedLesson.id}`
);
const lockedPage = await req(`/lessons/${lockedLesson.id}`);
check(lockedPage.status === 200 && !lockedPage.text.includes("youtube-nocookie"), "the locked page never ships the video reference");
/*
  A transcript is lesson content, so a locked viewer must not receive it
  either. Asserted against this lesson's own words rather than the heading, so
  it can only pass for the right reason — and loudly skipped rather than
  quietly passed when no paid lesson has one to withhold.
*/
if (lockedLesson.transcriptHi || lockedLesson.transcriptEn) {
  const words = (lockedLesson.transcriptHi ?? lockedLesson.transcriptEn).slice(0, 24);
  check(!lockedPage.text.includes(words), "the locked page withholds the transcript");
} else {
  console.log(`WARN: no paid lesson has a transcript, so the withholding check is not exercised (${lockedLesson.id})`);
}
check(lockedPage.text.includes("Gold"), "the locked page offers Gold");

console.log(`\n— payment —`);
const order = await req("/api/payments/order", { method: "POST" });
check(order.status === 200 && order.json?.simulated === true, "order created in simulation");
check((await req("/api/payments/simulate", { method: "POST" })).status === 200, "the webhook stand-in activates the membership");
const status = await req("/api/payments/status");
check(status.json?.state === "gold", "viewer state is now gold", `→ ${status.json?.state}`);
const unlocked = await req("/lessons/talk-to-ai-3");
// Every seeded video id is a TODO placeholder, so the player renders "being added"
// rather than an iframe. What matters here is that the lock is gone and the
// lesson content, the transcript, is now delivered.
check(unlocked.status === 200 && !unlocked.text.includes("This lesson is for Gold members"), "the paid lesson is no longer locked");
check(unlocked.text.includes("Read along"), "the paid lesson now delivers its transcript");
check((await req("/invite")).status === 200, "invite page opens for a gold member");
check((await req("/api/payments/order", { method: "POST" })).status === 409, "a gold member cannot order again");

console.log(`\n— referral —`);
const jarA = snapshot();
const goldA0 = status.json?.goldUntil;
check(
  Math.abs(monthsFromNow(goldA0) - goldMonths) < 0.5,
  `member A holds the plain ${goldMonths} month term`,
  `(${monthsFromNow(goldA0).toFixed(1)} mo)`
);
const invitePage = await req("/invite");
const refCode = invitePage.text.match(/data-referral-code="([A-Z0-9]{4,12})"/)?.[1] ?? null;
if (!check(Boolean(refCode), "member A has a referral code", refCode ?? "")) process.exit(1);
check((await req("/i/" + refCode)).status === 200, "the referral landing page renders for a real code");

jar.clear();
const phoneB = `+9197${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
check((await req("/api/auth/otp/send", { method: "POST", body: { phone: phoneB, referralCode: refCode } })).status === 200, "B requests a code with A's referral");
const codeB = await codeFromLog(phoneB);
if (!check(Boolean(codeB), "B's code found in the log")) process.exit(1);
check((await req("/api/auth/otp/verify", { method: "POST", body: { phone: phoneB, code: codeB, name: "Ramesh" } })).status === 200, "B signs up");
check((await req("/api/onboarding", { method: "POST", body: { lang: "en", categoryId: "safety" } })).status === 200, "B onboards choosing Staying safe");
const learnB = await req("/learn");
// Read the order off data-category, not off a heading. This check used to
// compare against the literal "Start here" and broke the day that category was
// renamed in content/kettle-content.json — reporting a product regression when
// the only thing that had changed was a display string.
const firstCategory = learnB.text.match(/data-category="([a-z0-9-]+)"/)?.[1] ?? null;
check(firstCategory === "safety", "B's Learn page puts the chosen category first", `→ ${firstCategory}`);
check(learnB.text.includes("Your pick"), "the chosen category is marked as theirs");
/*
  The interface is bilingual, so both scripts are in the HTML and CSS hides one.
  The old check here asserted no Devanagari at all, which was right when there
  was one language and became a false alarm the moment there were two.

  What still needs proving is that every Devanagari string went through the
  bilingual mechanism rather than being typed straight into a page — hardcoded
  Hindi would show to an English reader, which is the actual regression. So:
  the page declares English, and stripping every <span data-lang="hi"> leaves
  no Devanagari behind.
*/
check(/<html[^>]+lang="en"/.test(learnB.text), "B's Learn page declares English");
const visible = learnB.text
  // The RSC payload repeats every string of both languages inside a script
  // tag. That is the transport, not the page, and Devanagari there is right.
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<span lang="hi" data-lang="hi">[\s\S]*?<\/span>/g, "");
const leaked = visible.match(/[ऀ-ॿ]+/)?.[0] ?? null;
check(leaked === null, "no Devanagari outside a hi span on B's Learn page", leaked ? `→ "${leaked}"` : "");
// The popup renders on a timer, so the server HTML carries the joiner as props, not as text.
check(learnB.text.includes("daysAgo") && learnB.text.includes("Sunita"), "B, a free viewer, is served A as real social proof");

check((await req("/api/payments/order", { method: "POST" })).status === 200, "B orders");
const simB1 = await req("/api/payments/simulate", { method: "POST" });
check(simB1.json?.outcome === "activated", "B's payment activates");
const statusB = await req("/api/payments/status");
check(statusB.json?.state === "gold", "B is gold");
check(monthsFromNow(statusB.json?.goldUntil) > goldMonths + 0.5, "B received the extra referral month", `(${monthsFromNow(statusB.json?.goldUntil).toFixed(1)} mo)`);
const simB2 = await req("/api/payments/simulate", { method: "POST" });
check(simB2.json?.outcome === "idempotent", "a second webhook is a no-op");
const statusB2 = await req("/api/payments/status");
check(statusB2.json?.goldUntil === statusB.json?.goldUntil, "the no-op did not disturb B's term");
const learnB2 = await req("/learn");
check(!learnB2.text.includes("daysAgo"), "B, now gold, is sent no social proof at all");
const jarB = snapshot();

restore(jarA);
const statusA = await req("/api/payments/status");
check(monthsFromNow(statusA.json?.goldUntil) > goldMonths + 0.5, "A, the referrer, also received the extra month", `(${monthsFromNow(statusA.json?.goldUntil).toFixed(1)} mo)`);
const inviteA = await req("/invite");
check(inviteA.text.includes("Ramesh") && inviteA.text.includes("+1 month"), "A's invite page lists Ramesh with the bonus");

/*
  The catalogue editor.

  B is an ordinary signed-in learner, which is the account an attacker would
  actually have: they can sign in, so "not signed in" proves nothing. Every one
  of these is a way to write to the catalogue, and a catalogue write is the
  highest-value thing in this product — a lesson pointing at any video at all,
  shown to an audience being taught to trust it.

  /admin answers 404 rather than 403 on purpose. A 403 confirms the address
  exists; for the one route whose existence is itself worth knowing, it should
  not.

  These pass by the allow-list being empty for the smoke run, which is also how
  every environment except Rishav's is configured. If ADMIN_PHONES ever picks
  up the number this suite signs in with, they will fail loudly, which is the
  correct outcome.
*/
console.log(`\n— the catalogue editor —`);
const editorPage = await req("/admin");
check(editorPage.status === 404, "a signed-in learner gets 404 from /admin", `→ ${editorPage.status}`);
/*
  Asserted against the catalogue itself rather than against a word on the
  screen. The first version of this looked for "Catalogue" and failed on the
  string "CatalogueEditor" in the client-reference manifest — a module name,
  not a leak. What matters is that no course, no draft and no admin phone
  comes back, and that what does come back is the ordinary 404.
*/
check(!editorPage.text.includes("talk-to-ai") && !editorPage.text.includes("Start with AI"), "and no catalogue content comes back");
check(!editorPage.text.includes(phoneB), "and no admin allow-list is disclosed");
check(editorPage.text.includes("could not find"), "it is the ordinary not-found page");

for (const [path, body] of [
  ["/api/admin/categories", { id: "evil", nameHi: "x", nameEn: "x", sortOrder: 1 }],
  ["/api/admin/courses", { id: "evil", categoryId: "start", titleHi: "x", titleEn: "x", sortOrder: 1, isPublished: true }],
  [
    "/api/admin/lessons",
    { id: "evil", courseId: "talk-to-ai", titleHi: "x", titleEn: "x", video: "TODO", durationSec: 1, isFree: true, sortOrder: 99 },
  ],
  ["/api/admin/video", { video: "https://youtu.be/9fKQJcbd-jY" }],
]) {
  const res = await req(path, { method: "POST", body });
  check(res.status === 403, `${path} refuses a learner`, `→ ${res.status}`);
}

// The refusal must come before the body is read, so a malformed payload from a
// non-admin is still a 403 rather than a 400 that leaks which fields exist.
const junk = await req("/api/admin/lessons", { method: "POST", body: { nonsense: true } });
check(junk.status === 403, "and refuses before validating the body", `→ ${junk.status}`);

// Deletes too. A separate verb is a separate door.
const del = await req("/api/admin/courses", { method: "DELETE", body: { id: "talk-to-ai" } });
check(del.status === 403, "/api/admin/courses refuses a learner's DELETE", `→ ${del.status}`);
check((await req("/courses/talk-to-ai")).status === 200, "and the course it aimed at is still there");

console.log(`\n— account —`);
check((await req("/api/account", { method: "PATCH", body: { name: "Sunita Devi" } })).status === 200, "profile update saves");
check((await req("/account")).status === 200, "account page renders");
check((await req("/api/account", { method: "DELETE" })).status === 200, "A deletes their account");
check((await req("/api/payments/status")).json?.state === "anonymous", "A's session is gone after deletion");
restore(jarB);
check((await req("/api/account", { method: "DELETE" })).status === 200, "B deletes their account");

console.log(`\n${fail === 0 ? "All checks passed." : `${fail} FAILED, ${pass} passed.`}`);
process.exit(fail === 0 ? 0 : 1);
