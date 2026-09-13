import { z } from "zod";
import { LIMITS, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { displayName, indianPhone, lang as langSchema, otpCode, parseBody } from "@/lib/security/validators";
import { verifyCode } from "@/lib/auth/otp";
import { completeSignIn } from "@/lib/auth/signin";

const Body = z.object({
  phone: indianPhone,
  code: otpCode,
  name: displayName,
  lang: langSchema.default("hi"),
  /** Explicit, unticked by default. Consent has to be an action, not an assumption. */
  whatsappOptIn: z.boolean().default(false),
});

/**
 * Verifies the code, creates or finds the account, and starts a session.
 *
 * Consumer accounts live in the public tenant. The tenant is decided in
 * completeSignIn, on the server, and never read from the request.
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const body = await parseBody(req, Body);

    await enforceRate(`otp-verify:${body.phone}`, LIMITS.otpVerifyPhone);

    const result = await verifyCode(body.phone, body.code);
    if (!result.ok) {
      // One generic message. Telling the caller which of the four things went
      // wrong helps an attacker more than it helps a person who mistyped.
      return Response.json({ error: "bad_code", reason: result.reason }, { status: 401 });
    }

    const { isNew } = await completeSignIn({
      // Proven by the challenge we just consumed for this exact number.
      phone: body.phone,
      name: body.name,
      lang: body.lang,
      whatsappOptIn: body.whatsappOptIn,
      referredByCode: result.referredByCode,
      ip: await clientIp(),
      method: "otp",
    });

    return Response.json({ ok: true, isNew });
  } catch (err) {
    return toErrorResponse(err);
  }
}
