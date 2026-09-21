import { z } from "zod";
import { LIMITS, RateLimited, checkRate, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { indianPhone, lang as langSchema, parseBody, referralCode } from "@/lib/security/validators";
import { issueCode } from "@/lib/auth/otp";
import { sms } from "@/lib/auth/sms";
import { recordSend } from "@/lib/auth/sms-delivery";
import { reviewCodeFor } from "@/lib/auth/review";

const Body = z.object({
  phone: indianPhone,
  lang: langSchema.default("hi"),
  referralCode: referralCode,
});

/**
 * Sends a verification code.
 *
 * Rate limited twice: per phone, which stops someone bombing one person's
 * handset, and per IP, which stops one attacker spraying many numbers. The
 * response is deliberately identical whether or not the number has an account,
 * so this endpoint cannot be used to discover who is a member.
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const { phone, lang, referralCode: ref } = await parseBody(req, Body);

    await enforceRate(`otp-send:${phone}`, LIMITS.otpSendPhone);
    await enforceRate(`otp-send-ip:${await clientIp()}`, LIMITS.otpSendIp);

    /*
      The circuit breaker. Checked last so a single abusive phone or address is
      turned away by its own limit first and does not consume the shared
      budget. See LIMITS.otpSendGlobal for why a per-IP cap is not enough.
    */
    const global = await checkRate("otp-send-global", LIMITS.otpSendGlobal);
    if (!global.ok) {
      console.error("[otp] daily send ceiling reached — refusing all sends. Check for abuse before raising it.");
      throw new RateLimited(global.retryAfterSec);
    }

    const issued = await issueCode(phone, ref);
    // Inside the resend gap. Same shape as a rate limit, because to the caller
    // that is exactly what it is.
    if (!issued.ok) throw new RateLimited(issued.retryAfterSec);

    /*
      The review account is told nothing. Its code is fixed and already
      known to whoever is reviewing, the number may not receive SMS at all,
      and every send costs money. The challenge row above was still written,
      so verification is the ordinary path.
    */
    if (reviewCodeFor(phone) === null) {
      // A failed send throws SmsError, which answers 502 send_failed rather
      // than a bare 500: the caller should be told to try again, not that we broke.
      const providerMessageId = await sms.sendOtp(phone, issued.code, lang);

      // Only reached once the provider has accepted it. Accepted is not
      // delivered; the delivery report that arrives at /api/webhooks/msg91
      // updates this row with what actually happened.
      await recordSend({ provider: sms.name, providerMessageId, phone });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
