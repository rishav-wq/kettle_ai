/*
  Drives the catalogue editor the way a browser does.

  Signs in as an admin, creates a category, a course and a lesson, proves every
  invariant that protects the catalogue, checks a draft stays off the Learn
  page until it is published, then deletes everything it made and the account
  it made it with.

  Needs a dev server whose ADMIN_PHONES contains the number below, which is why
  it is separate from npm run smoke: that suite proves a learner cannot reach
  any of this, and this one proves an admin can.

    ADMIN_PHONES=+919900000001 npm run dev
    npm run smoke:admin -- http://localhost:3000 .next/dev/logs/next-development.log

  It leaves the database as it found it. If it fails part way through, the
  documents it names all start with "smoke-".
*/
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const LOG = process.argv[3];
const PHONE = process.argv[4] ?? "+919900000001";

const jar = new Map();
let pass = 0;
let fail = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
};

async function req(path, { method = "GET", body, origin = BASE } = {}) {
  const headers = { origin, host: new URL(BASE).host };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

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
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
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
  throw new Error(`no code for ${phone}`);
}

console.log("— signing in as the admin —");
check((await req("/api/auth/otp/send", { method: "POST", body: { phone: PHONE } })).status === 200, "code requested");
const code = await codeFor(PHONE);
const verified = await req("/api/auth/otp/verify", { method: "POST", body: { phone: PHONE, code, name: "Rishav" } });
check(verified.status === 200, "signed in", `→ ${verified.status}`);

console.log("\n— the editor opens —");
const page = await req("/admin");
check(page.status === 200, "/admin renders for the admin", `→ ${page.status}`);
check(page.text.includes("Catalogue"), "and shows the catalogue");

console.log("\n— creating —");
const cat = { id: "smoke-cat", nameEn: "Smoke category", nameHi: "धुआँ श्रेणी", sortOrder: 900 };
check((await req("/api/admin/categories", { method: "POST", body: cat })).status === 200, "a category is created");

const course = {
  id: "smoke-course",
  categoryId: "smoke-cat",
  titleEn: "Smoke course",
  titleHi: "धुआँ कोर्स",
  sortOrder: 900,
  isPublished: false,
};
check((await req("/api/admin/courses", { method: "POST", body: course })).status === 200, "a course is created as a draft");

const lesson = {
  id: "smoke-lesson",
  courseId: "smoke-course",
  titleEn: "Smoke lesson",
  titleHi: "धुआँ पाठ",
  video: "https://www.youtube.com/watch?v=9fKQJcbd-jY&t=42s&list=PLabc",
  durationSec: 300,
  isFree: false,
  sortOrder: 1,
};
const made = await req("/api/admin/lessons", { method: "POST", body: lesson });
check(made.status === 200, "a lesson is created");
check(made.json?.providerRef === "9fKQJcbd-jY", "and a messy watch URL is stored as the bare id", `→ ${made.json?.providerRef}`);

console.log("\n— the invariants hold —");
const badVideo = await req("/api/admin/lessons", { method: "POST", body: { ...lesson, id: "smoke-bad", video: "https://example.com/nope" } });
check(badVideo.status === 400, "an unreadable video link is refused", `→ ${badVideo.status}`);

const fifthFree = await req("/api/admin/lessons", { method: "POST", body: { ...lesson, isFree: true } });
check(fifthFree.status === 403, "a fifth free lesson is refused", `→ ${fifthFree.status}`);

const badCat = await req("/api/admin/courses", { method: "POST", body: { ...course, id: "smoke-orphan", categoryId: "no-such-category" } });
check(badCat.status === 400, "a course in a category that does not exist is refused", `→ ${badCat.status}`);

const catWithCourses = await req("/api/admin/categories", { method: "DELETE", body: { id: "smoke-cat" } });
check(catWithCourses.status === 403, "a category with courses cannot be deleted", `→ ${catWithCourses.status}`);

const courseWithLessons = await req("/api/admin/courses", { method: "DELETE", body: { id: "smoke-course" } });
check(courseWithLessons.status === 403, "a course with lessons cannot be deleted", `→ ${courseWithLessons.status}`);

console.log("\n— drafts stay invisible —");
check(!(await req("/learn")).text.includes("Smoke course"), "an unpublished course is absent from Learn");
check((await req("/api/admin/courses", { method: "POST", body: { ...course, isPublished: true } })).status === 200, "the course is published");
check((await req("/learn")).text.includes("Smoke course"), "and now appears on Learn");

console.log("\n— the link is confirmed against YouTube —");
const look = await req("/api/admin/video", { method: "POST", body: { video: "9fKQJcbd-jY" } });
check(look.status === 200, "a lookup answers", `→ ${look.status}`);
check(typeof look.json?.ok === "boolean", "with a verdict", `→ ok=${look.json?.ok} ${look.json?.title ?? look.json?.reason ?? ""}`);

console.log("\n— cross origin is still refused —");
check(
  (await req("/api/admin/categories", { method: "POST", body: cat, origin: "https://evil.example" })).status === 403,
  "even for an admin"
);

console.log("\n— cleaning up —");
check((await req("/api/admin/lessons", { method: "DELETE", body: { id: "smoke-lesson" } })).status === 200, "lesson deleted");
check((await req("/api/admin/courses", { method: "DELETE", body: { id: "smoke-course" } })).status === 200, "course deleted");
check((await req("/api/admin/categories", { method: "DELETE", body: { id: "smoke-cat" } })).status === 200, "category deleted");
check(!(await req("/learn")).text.includes("Smoke course"), "and Learn is back to what it was");
check((await req("/api/account", { method: "DELETE" })).status === 200, "the admin test account is removed");

console.log(`\n${fail === 0 ? "All admin checks passed." : `${fail} FAILED, ${pass} passed.`}`);
process.exit(fail === 0 ? 0 : 1);
