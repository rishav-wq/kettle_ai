import "server-only";
import { env } from "@/lib/env";

/*
  Server-side verification of the MSG91 OTP widget's access token.

  The widget runs in the browser: it sends the code, collects it, and on
  success hands the page a JWT. That JWT is a claim, not a proof — a claim made
  by code we do not control, on a device we do not control. It becomes proof
  only here, where MSG91's own API is asked whether the token is genuine and,
  crucially, which identifier it verified.

  The one rule this file exists to enforce: the caller learns the identifier
  from MSG91, never from the request. A browser can hold a genuine token for
  its own number and ask us to sign it in as somebody else's; taking the number
  from the response rather than the request makes that impossible rather than
  merely checked for.
*/

const ENDPOINT = "https://control.msg91.com/api/v5/widget/verifyAccessToken";
const TIMEOUT_MS = 8000;

export type WidgetVerification =
  | { ok: true; identifier: string }
  | { ok: false; reason: string };

/** True when a widget is configured and the sign-in screen should use it. */
export function widgetIsConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_MSG91_WIDGET_ID && env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN && env.MSG91_AUTH_KEY);
}

/** Pulls the first non-empty string at any of these keys, at the top level or one down. */
function pluck(payload: Record<string, unknown>, keys: string[]): { value: string; key: string } | null {
  const sources: Record<string, unknown>[] = [payload];
  for (const value of Object.values(payload)) {
    if (value && typeof value === "object" && !Array.isArray(value)) sources.push(value as Record<string, unknown>);
  }
  for (const source of sources) {
    for (const key of keys) {
      const found = source[key];
      if (typeof found === "string" && found.trim() !== "") return { value: found.trim(), key };
      if (typeof found === "number") return { value: String(found), key };
    }
  }
  return null;
}

/*
  Which key the identifier actually arrived under, reported once per process.

  The list of candidates below is a hedge against documentation I could not
  verify. Knowing which one MSG91 really uses is what lets it be narrowed to
  that one later. The key name is logged; the number never is.
*/
let reportedKey = false;

export async function verifyAccessToken(accessToken: string): Promise<WidgetVerification> {
  const authkey = env.MSG91_AUTH_KEY;
  if (!authkey) return { ok: false, reason: "not_configured" };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ authkey, "access-token": accessToken }),
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.name : "network" };
  }

  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
  } catch {
    // Falls through to the not-a-success path below.
  }

  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  if (!res.ok || type === "error") {
    return { ok: false, reason: `provider_${res.status}` };
  }
  if (type !== "success") {
    // Anything that is not an explicit success is treated as a failure. An
    // unrecognised shape must never be read as permission to sign somebody in.
    console.error(`[widget] unrecognised verifyAccessToken response: ${text.slice(0, 300)}`);
    return { ok: false, reason: "unrecognised_response" };
  }

  /*
    On success MSG91 returns the verified identifier. The exact key is not
    something I could confirm against a live account, so several plausible
    spellings are tried — and if none match we fail closed and log the shape.
    Refusing a real sign-in is a bug worth fixing; accepting an unverified one
    is not a bug we could recover from.
  */
  const found = pluck(payload, ["message", "identifier", "mobile", "phone", "number", "identifierValue"]);
  if (!found) {
    console.error(`[widget] verifyAccessToken gave no identifier: ${text.slice(0, 300)}`);
    return { ok: false, reason: "no_identifier" };
  }

  if (!reportedKey) {
    reportedKey = true;
    console.log(`[widget] identifier arrives under "${found.key}" — the candidate list can be narrowed to this one.`);
  }

  return { ok: true, identifier: found.value };
}
