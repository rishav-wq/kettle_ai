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
}: {
  next: string | null;
  referralCode: string | null;
  devMode: boolean;
  /** Null when no widget is configured, in which case our own OTP endpoints are used. */
  widget: { id: string; token: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [ref, setRef] = useState(referralCode ?? "");
  const [optIn, setOptIn] = useState(false);
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

    const res = await post("/api/auth/otp/send", { phone, lang: "en", referralCode: ref || undefined });
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
        lang: "en",
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

    const res = await post("/api/auth/otp/verify", { phone, code: value, name: name.trim(), lang: "en", whatsappOptIn: optIn });
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
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-ground lg:max-w-none lg:items-center lg:justify-center lg:bg-wash lg:px-6 lg:py-10">
      {widget ? (
        <Script
          src={WIDGET_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => initWidget(widget.id, widget.token)}
          onError={() => setError("send_failed")}
        />
      ) : null}
      <div className="flex flex-col lg:pointer-events-auto lg:relative lg:z-10 lg:w-full lg:max-w-[460px] lg:overflow-hidden lg:rounded-[28px] lg:bg-paper lg:shadow-l">
      <header className="grad rounded-b-[34px] px-5 pb-9 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:rounded-none lg:px-8 lg:pb-8 lg:pt-7">
        <div className="flex min-h-[44px] items-center">
          {step === "code" ? (
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              aria-label="Back"
              className="grid h-11 w-11 place-items-center rounded-pill bg-white/18 text-lg backdrop-blur-sm hover:bg-white/28"
            >
              ←
            </button>
          ) : (
            <Wordmark href="/" className="text-white" size="sm" />
          )}
        </div>
        <h1 className="mt-4 text-[1.8rem] font-bold leading-tight">{step === "phone" ? "Keep your place" : "Enter the code"}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">
          {step === "phone" ? "Your name and mobile number. We send a 6 digit code by SMS." : `Sent to +91 ${digits.slice(-10)}`}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-6 lg:flex-none lg:px-8 lg:pb-9">
        {step === "phone" ? (
          <>
            <Field label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                enterKeyHint="next"
                placeholder="Sunita"
                className="min-h-[44px] w-full bg-transparent text-[1.05rem] font-medium outline-none placeholder:text-ink-3"
              />
            </Field>

            <Field label="Mobile number">
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

            <Field label="Referral code, if a friend sent you">
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Optional"
                className="min-h-[44px] w-full bg-transparent text-[1.05rem] font-semibold tracking-[0.12em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-3"
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-tile bg-paper p-4 shadow-s">
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 h-6 w-6 flex-none accent-[var(--violet)]" />
              <span className="text-[0.92rem] leading-snug text-ink-2">Remind me on WhatsApp when a lesson is waiting. You can turn this off any time.</span>
            </label>

            {error ? <ErrorNote code={error} /> : null}

            <Button full size="lg" disabled={!ready || busy} onClick={() => void send()}>
              {busy ? "Sending…" : "Send the code"}
            </Button>

            <p className="text-center text-[0.82rem] leading-relaxed text-ink-3">
              By signing in you accept our{" "}
              <Link href="/legal/terms" className="underline underline-offset-4">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
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
                <strong className="font-semibold text-ink">Kettle will never call you</strong> or ask for this code. If someone calls asking for it, that is a scam.
              </p>
            </Card>

            <Button full size="lg" disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <Button full variant="soft" disabled={resendIn > 0 || busy} onClick={() => void resend()}>
              {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, "0")}` : "Resend the code"}
            </Button>
          </>
        )}
      </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.82rem] font-medium text-ink-3">{label}</span>
      <span className="flex min-h-[60px] items-center gap-3 rounded-tile bg-paper px-4 shadow-s focus-within:ring-2 focus-within:ring-violet">{children}</span>
    </label>
  );
}

function ErrorNote({ code }: { code: string }) {
  const map: Record<string, string> = {
    too_many: "Too many tries. Please wait a little and try again.",
    send_failed: "The code could not be sent. Check the number and try again.",
    bad_code: "That code is not right. Please enter it again.",
  };
  return (
    <p role="alert" className="rounded-tile bg-pink/10 px-4 py-3 text-[0.9rem] font-medium text-pink">
      {map[code] ?? map.send_failed}
    </p>
  );
}
