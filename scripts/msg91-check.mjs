/*
  Is the MSG91 account actually usable?

  Reads the auth key from .env.local, never prints it, and asks MSG91 a
  read-only question. Sends no SMS and spends nothing. This is the check that
  separates "I pasted a key" from "the key works, the account is live, and KYC
  has cleared" — three things that look identical from inside the app until the
  first real send fails.
*/
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".env.local");
if (!existsSync(file)) {
  console.error("No .env.local");
  process.exit(1);
}

const env = {};
for (const raw of readFileSync(file, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}

const authkey = env.MSG91_AUTH_KEY;
if (!authkey) {
  console.error("MSG91_AUTH_KEY is not set in .env.local");
  process.exit(1);
}

console.log(`auth key:   present (${authkey.length} chars)`);

async function ask(label, url) {
  try {
    const res = await fetch(url, { headers: { authkey, accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    console.log(`${label.padEnd(11)} HTTP ${res.status}  ${text.slice(0, 180)}`);
    return { status: res.status, text };
  } catch (err) {
    console.log(`${label.padEnd(11)} failed: ${err?.message ?? err}`);
    return null;
  }
}

// Transactional SMS balance. Read-only; the answer tells us whether the key is
// accepted at all, which is the real question.
await ask("balance:", "https://control.msg91.com/api/v5/balance?type=4");

/*
  Also ask the widget's own verification endpoint with a token that cannot be
  valid. A "bad token" answer means the key was accepted and the widget product
  is reachable; an auth complaint means the key is the problem, not the token.
*/
try {
  const res = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ authkey, "access-token": "not-a-real-token" }),
  });
  const text = await res.text();
  console.log(`widget:     HTTP ${res.status}  ${text.slice(0, 180)}`);
} catch (err) {
  console.log(`widget:     failed: ${err?.message ?? err}`);
}
