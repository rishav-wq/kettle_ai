"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, OtpInput } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import Script from "next/script";
import { post } from "@/lib/http";
import { Wordmark } from "@/components/logo";
import { WIDGET_SCRIPT, initWidget, toIdentifier, widgetRetry, widgetSend, widgetVerify } from "@/lib/auth/widget-client";
import type { Lang } from "@/lib/lang";
import { T, TN } from "@/components/bilingual";
import { pick } from "@/lib/pick";

type Step = "phone" | "code";

/**
 * Sign in.
 *
 * Two screens, one decision each. The scam warning sits inside the flow rather
 * than in a help page, because this is the exact moment a real attacker would
 * call and ask for the code.
 */
export function SignInFlow({
  next,
  referralCode,
  devMode,
  widget,
  lang,
}: {
  next: string | null;
  referralCode: string | null;
  devMode: boolean;
  /** What they were already reading in, saved onto the new account. */
  lang: Lang;
  /** Null when no widget is configured, in which case our own OTP endpoints are used. */
  widget: { id: string; token: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [ref, setRef] = useState(referralCode ?? "");
  // WhatsApp reminders are opted into on the account screen, not here.
  const optIn = false;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const digits = phone.replace(/\D/g, "");
  const ready = digits.length >= 10 && name.trim().length > 0;

  /*
    Two ways to prove the number, one screen.

    With a widget configured, MSG91 sends and checks the code and we exchange
    its token for a session. Without one — local development, or before the
    account exists — the app's own OTP endpoints do it and the code is printed
    to the server log. The screen, the copy and the session are identical
    either way; only the proof differs.
  */

  async function send() {
    setBusy(true);
    setError(null);

    if (widget) {
      try {
        await widgetSend(toIdentifier(phone));
      } catch {
        setBusy(false);
        return setError("send_failed");
      }
      setBusy(false);
      setStep("code");
      setResendIn(30);
      return;
    }

    const res = await post("/api/auth/otp/send", { phone, lang, referralCode: ref || undefined });
    setBusy(false);
    if (!res.ok) return setError(res.status === 429 ? "too_many" : "send_failed");
    setStep("code");
    setResendIn(30);
  }

  async function resend() {
    if (!widget) return send();
    setBusy(true);
    setError(null);
    try {
      await widgetRetry(toIdentifier(phone));
      setResendIn(30);
    } catch {
      setError("send_failed");
    }
    setBusy(false);
  }

  async function verify(value: string) {
    setBusy(true);
    setError(null);

    if (widget) {
      let accessToken: string;
      try {
        accessToken = await widgetVerify(value);
      } catch {
        setBusy(false);
        setError("bad_code");
        setCode("");
        return;
      }
      // The phone is deliberately not sent. The server asks MSG91 which number
      // this token verified and uses that, so the browser cannot nominate one.
      const res = await post("/api/auth/widget/verify", {
        accessToken,
        name: name.trim(),
        lang,
        whatsappOptIn: optIn,
        referralCode: ref || undefined,
      });
      setBusy(false);
      if (!res.ok) {
        setError(res.status === 429 ? "too_many" : "bad_code");
        setCode("");
        return;
      }
      router.replace((res.body as { isNew?: boolean })?.isNew ? "/onboarding" : (next ?? "/learn"));
      router.refresh();
      return;
    }

    const res = await post("/api/auth/otp/verify", { phone, code: value, name: name.trim(), lang, whatsappOptIn: optIn });
    setBusy(false);
    if (!res.ok) {
      setError(res.status === 429 ? "too_many" : "bad_code");
      setCode("");
      return;
    }
    router.replace((res.body as { isNew?: boolean })?.isNew ? "/onboarding" : (next ?? "/learn"));
    router.refresh();
  }

  return (
    /* A card inside the app frame rather than a page of its own. Signing in
       used to replace the whole screen, so the bottom bar vanished and the app
       appeared to have been exited — unsettling for an audience who are not
       sure what they just tapped. The frame stays; only the panel changes. */
    <div className="mx-auto w-full max-w-[460px] pt-2">
      {widget ? (
        <Script
          src={WIDGET_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => initWidget(widget.id, widget.token)}
          onError={() => setError("send_failed")}
        />
      ) : null}
      <div className="flex flex-col overflow-hidden rounded-[28px] bg-paper shadow-m">
      <header className="grad px-6 pb-8 pt-6 text-white lg:px-8 lg:pb-8 lg:pt-7">
        <div className="flex min-h-[44px] items-center">
          {step === "code" ? (
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              aria-label={pick(lang, "पीछे", "Back")}
              className="grid h-11 w-11 place-items-center rounded-pill bg-white/18 text-lg backdrop-blur-sm hover:bg-white/28"
            >
              ←
            </button>
          ) : (
            <Wordmark href="/" className="text-white" size="sm" tone="milk" />
          )}
        </div>
        <h1 className="mt-4 text-[1.8rem] font-bold leading-tight">
          {step === "phone" ? (
            <T hi="अपनी प्रगति सहेजने के लिए साइन इन कीजिए" en="Sign in to save your progress" />
          ) : (
            <T hi="कोड डालिए" en="Enter the code" />
          )}
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">
          {step === "phone" ? (
            <T
              hi="अपनी जानकारी भरिए। हम आपके mobile पर 6 अंकों का code भेजेंगे। कोई password नहीं चाहिए।"
              en="Enter your details. We’ll send a 6-digit code to your mobile. No password needed."
            />
          ) : (
            <T hi={`+91 ${digits.slice(-10)} पर भेजा गया`} en={`Sent to +91 ${digits.slice(-10)}`} />
          )}
        </p>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-8 pt-6 lg:px-8 lg:pb-9">
        {step === "phone" ? (
          <>
            <Field label={<T hi="आपका नाम" en="Your name" />}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                enterKeyHint="next"
                placeholder={pick(lang, "सुनीता", "Sunita")}
                className="min-h-[44px] w-full bg-transparent text-[1.05rem] font-medium outline-none placeholder:text-ink-3"
              />
            </Field>

            <Field label={<T hi="मोबाइल नंबर" en="Mobile number" />}>
              <span className="border-r border-line pr-3 text-[1rem] font-semibold text-ink-3">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="go"
                onKeyDown={(e) => e.key === "Enter" && ready && !busy && void send()}
                placeholder="98213 40917"
                className="min-h-[44px] w-full bg-transparent text-[1.15rem] font-semibold tabular-nums tracking-wide outline-none placeholder:text-ink-3"
              />
            </Field>

            <Field label={<T hi="कोई referral code है?" en="Have a referral code?" />}>
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                placeholder={pick(lang, "ज़रूरी नहीं", "Optional")}
                className="min-h-[44px] w-full bg-transparent text-[1.05rem] font-semibold tracking-[0.12em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-3"
              />
            </Field>

            {error ? <ErrorNote code={error} /> : null}

            <Button full size="lg" disabled={!ready || busy} onClick={() => void send()}>
              {busy ? <T hi="भेजा जा रहा है…" en="Sending…" /> : <T hi="SMS code भेजिए" en="Send SMS code" />}
            </Button>

            {/* Two sentences, not one template: the links sit in different
                places in the two languages. */}
            <TN
              className="text-center text-[0.82rem] leading-relaxed text-ink-3"
              hi={
                <>
                  साइन इन करके आप हमारी{" "}
                  <Link href="/legal/terms" className="underline underline-offset-4">
                    शर्तें
                  </Link>{" "}
                  और{" "}
                  <Link href="/legal/privacy" className="underline underline-offset-4">
                    निजता नीति
                  </Link>{" "}
                  स्वीकार करते हैं।
                </>
              }
              en={
                <>
                  By signing in you accept our{" "}
                  <Link href="/legal/terms" className="underline underline-offset-4">
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" className="underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </>
              }
            />
          </>
        ) : (
          <>
            {devMode ? (
              <p className="rounded-tile border border-dashed border-line px-4 py-3 text-[0.85rem] text-ink-3">
                No SMS provider is configured, so the code is printed in the server terminal.
              </p>
            ) : null}

            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6 && !busy) void verify(v);
              }}
              disabled={busy}
            />

            {error ? <ErrorNote code={error} /> : null}

            <Card className="flex gap-3 p-4">
              <ShieldIcon className="h-6 w-6 flex-none text-violet" />
              <p className="text-[0.9rem] leading-snug text-ink-2">
                <TN
                  hi={
                    <>
                      <strong className="font-semibold text-ink">Kettle आपको कभी फ़ोन नहीं करेगा</strong> और यह code कभी नहीं पूछेगा। अगर कोई फ़ोन
                      करके यह code माँगे, तो वह धोखा है।
                    </>
                  }
                  en={
                    <>
                      <strong className="font-semibold text-ink">Kettle will never call you</strong> or ask for this code. If someone calls asking
                      for it, that is a scam.
                    </>
                  }
                />
              </p>
            </Card>

            <Button full size="lg" disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>
              {busy ? <T hi="जाँच रहे हैं…" en="Checking…" /> : <T hi="साइन इन कीजिए" en="Sign in" />}
            </Button>
            <Button full variant="soft" disabled={resendIn > 0 || busy} onClick={() => void resend()}>
              {resendIn > 0 ? (
                <T
                  hi={`0:${String(resendIn).padStart(2, "0")} में दोबारा`}
                  en={`Resend in 0:${String(resendIn).padStart(2, "0")}`}
                />
              ) : (
                <T hi="code दोबारा भेजिए" en="Resend the code" />
              )}
            </Button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.82rem] font-medium text-ink-3">{label}</span>
      <span className="flex min-h-[60px] items-center gap-3 rounded-tile border border-line bg-paper px-4 transition-colors focus-within:border-violet focus-within:ring-2 focus-within:ring-violet/25">
        {children}
      </span>
    </label>
  );
}

function ErrorNote({ code }: { code: string }) {
  const map: Record<string, { hi: string; en: string }> = {
    too_many: {
      hi: "बहुत बार कोशिश हो गई। थोड़ी देर रुककर फिर कोशिश कीजिए।",
      en: "Too many tries. Please wait a little and try again.",
    },
    send_failed: {
      hi: "Code भेजा नहीं जा सका। नंबर जाँचकर फिर कोशिश कीजिए।",
      en: "The code could not be sent. Check the number and try again.",
    },
    bad_code: { hi: "यह code सही नहीं है। दोबारा डालिए।", en: "That code is not right. Please enter it again." },
  };
  const m = map[code] ?? map.send_failed;
  return (
    <p role="alert" className="rounded-tile bg-pink/10 px-4 py-3 text-[0.9rem] font-medium text-pink">
      <T hi={m.hi} en={m.en} />
    </p>
  );
}
