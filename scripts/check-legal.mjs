/*
  Is the site ready to be submitted to Razorpay for a live account?

    npm run check:legal

  Razorpay reviews the policy pages by hand before approving live keys, and a
  rejection puts you back in the queue. Everything below is something they have
  rejected merchants for: a missing registered address, no reachable telephone
  number, a policy page that still says "to confirm".

  It exits non-zero when something is unfilled, so it can gate a deploy later
  if that ever becomes useful. Today it exists to be read.
*/
import { readFileSync } from "node:fs";

const site = JSON.parse(readFileSync(new URL("../content/kettle-site.json", import.meta.url), "utf8"));
const b = site.business;

let bad = 0;
const fail = (what, why) => {
  console.log(`  MISSING  ${what.padEnd(18)} ${why}`);
  bad++;
};
const ok = (what, value) => console.log(`  ok       ${what.padEnd(18)} ${value}`);

const unfilled = (v) => typeof v !== "string" || v.trim() === "" || /TO CONFIRM/i.test(v);

console.log("Razorpay live-account checklist\n");

if (!b) {
  console.log('  MISSING  business        the "business" block is absent from content/kettle-site.json');
  process.exit(1);
}

const required = [
  ["legalName", "the registered name, and it must match the Razorpay account exactly"],
  ["entityType", "sole proprietorship, private limited, LLP"],
  ["city", "part of the registered address"],
  ["state", "Razorpay asks for the state specifically"],
  ["postcode", "Razorpay asks for the PIN specifically"],
  ["email", "must be publicly visible and monitored"],
  ["phone", "a reachable telephone number, not only WhatsApp"],
  ["whatsapp", "the number the help page links to"],
  ["grievanceName", "required by India's IT Rules and the DPDP Act, not by Razorpay"],
  ["grievanceEmail", "the grievance officer must be reachable"],
  ["jurisdiction", "the city whose courts govern the terms"],
  ["updated", "the date the policies were last reviewed"],
];

for (const [key, why] of required) {
  if (unfilled(b[key])) fail(key, why);
  else ok(key, b[key]);
}

if (!Array.isArray(b.addressLines) || b.addressLines.length === 0 || b.addressLines.some(unfilled)) {
  fail("addressLines", "the street address, above city and state");
} else {
  ok("addressLines", b.addressLines.join(", "));
}

if (b.placeholder === true) {
  console.log(`\n  business.placeholder is still true, so every one of these renders on the`);
  console.log(`  live site with a dashed border and an EXAMPLE chip. Set it to false only`);
  console.log(`  once the values above are real.`);
  bad++;
}

console.log(
  bad === 0
    ? "\nReady to submit. The policy pages carry real details."
    : `\n${bad} thing${bad === 1 ? "" : "s"} to fill before submitting to Razorpay.`
);
process.exit(bad === 0 ? 0 : 1);
