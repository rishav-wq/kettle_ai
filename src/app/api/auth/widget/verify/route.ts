import { z } from "zod";
import { LIMITS, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { displayName, indianPhone, lang as langSchema, parseBody, referralCode } from "@/lib/security/validators";
import { verifyAccessToken } from "@/lib/auth/msg91-widget";
import { completeSignIn } from "@/lib/auth/signin";

/*
  Sign-in via the MSG91 OTP widget.

  Note what this body does not contain: a phone number. The widget verified
  one, MSG91 knows which, and that is the only source we accept. A request can
  carry a genuine token and any name it likes; it cannot nominate whose account
  to open. That is the single most important line in this file.

  The referral code is still taken from the request, because it is not a
  credential — it decides who gets a free month, is validated against real
  codes downstream, and the worst a forged one does is misattribute a reward.
*/
const Body = z.object({
  accessToken: z.string().min(10).max(4096),
  name: displayName,
  lang: langSchema.default("en"),
  /** Explicit, unticked by default. Consent has to be an action, not an assumption. */
  whatsappOptIn: z.boolean().default(false),
  referralCode: referralCode,
});

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const body = await parseBody(req, Body);

    // The phone is unknown until MSG91 answers, so the only thing that can be
    // rate limited up front is the caller.
    const ip = await clientIp();
    await enforceRate(`widget-verify-ip:${ip}`, LIMITS.widgetVerifyIp);

    const verified = await verifyAccessToken(body.accessToken);
    if (!verified.ok) {
      // Deliberately uniform. A caller probing tokens learns only that it failed.
      return Response.json({ error: "bad_token" }, { status: 401 });
    }

    /*
      MSG91 returns the identifier in its own format — typically without the
      leading plus. Running it through the same validator as every other phone
      normalises it to E.164 and refuses anything that is not an Indian mobile,
      so a surprising response cannot become a surprising account.
    */
    const phone = indianPhone.safeParse(verified.identifier);
    if (!phone.success) {
      console.error(`[widget] verified identifier is not an Indian mobile: ${verified.identifier}`);
      return Response.json({ error: "bad_token" }, { status: 401 });
    }

    await enforceRate(`otp-verify:${phone.data}`, LIMITS.otpVerifyPhone);

    const { isNew } = await completeSignIn({
      phone: phone.data,
      name: body.name,
      lang: body.lang,
      whatsappOptIn: body.whatsappOptIn,
      referredByCode: body.referralCode ?? null,
      ip,
      method: "widget",
    });

    return Response.json({ ok: true, isNew });
  } catch (err) {
    return toErrorResponse(err);
  }
}
