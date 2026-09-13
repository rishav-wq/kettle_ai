/*
  Sends one real verification code, through the same sender the app uses.

    npm run sms:test -- +919821340917

  This exists because the first live SMS is where the DLT paperwork actually
  gets tested, and finding out through the sign-in screen means guessing from a
  red box. Here the provider's own refusal is printed.

  It sends a real message that costs real money and arrives on a real handset,
  so the number must be given explicitly and is echoed back before sending.
  The code is printed too: this is a test of delivery, so you need to compare
  what arrives against what was sent.
*/
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";

/** Minimal .env.local reader. The app gets these from the hosting platform. */
function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const arg = process.argv[2];
  const lang = process.argv[3] === "hi" ? "hi" : "en";

  if (!arg) {
    console.error("Usage: npm run sms:test -- +919821340917 [hi|en]");
    process.exit(1);
  }

  // The same normalisation the API uses, so this tests the real format.
  const { indianPhone } = await import("../src/lib/security/validators");
  const parsed = indianPhone.safeParse(arg);
  if (!parsed.success) {
    console.error(`Not a valid Indian mobile number: ${arg}`);
    process.exit(1);
  }
  const phone = parsed.data;

  const { pick } = await import("../src/lib/auth/sms");
  const sender = pick();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  console.log(`sender:   ${sender.name}`);
  console.log(`to:       ${phone}`);
  console.log(`language: ${lang}`);
  console.log(`code:     ${code}`);
  if (sender.name === "dev") {
    console.log("\nNo MSG91 credentials found, so nothing will leave this machine.");
    console.log("Set MSG91_AUTH_KEY and a template id in .env.local to send for real.\n");
  }

  try {
    await sender.sendOtp(phone, code, lang);
    if (sender.name === "dev") {
      console.log("\nPrinted above. Nothing was sent.\n");
      return;
    }
    console.log("\nAccepted by the provider. If nothing arrives within a minute the");
    console.log("usual causes are an unapproved template, a sender id that does not");
    console.log("match the DLT registration, or the number being on the DND list.\n");
  } catch (err) {
    console.error(`\nRefused: ${err instanceof Error ? err.message : String(err)}`);
    console.error("The provider's own message is logged above this line.\n");
    process.exit(1);
  }
}

void main();
