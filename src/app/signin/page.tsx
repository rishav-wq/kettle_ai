import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/viewer";
import { smsIsDev } from "@/lib/auth/sms";
import { widgetIsConfigured } from "@/lib/auth/msg91-widget";
import { env } from "@/lib/env";
import { getLang } from "@/lib/lang";
import { reviewPhone } from "@/lib/auth/review";
import { SignInFlow } from "./flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; ref?: string }> }) {
  const viewer = await getViewer();
  const { next, ref } = await searchParams;

  if (viewer.userId) redirect(viewer.onboarded ? (safeNext(next) ?? "/learn") : "/onboarding");

  /* Both of these are public by design — they identify the widget, they do not
     authorise anything. A session still requires the server to verify the
     token with the account-level auth key, which never leaves this machine. */
  const widget = widgetIsConfigured()
    ? { id: env.NEXT_PUBLIC_MSG91_WIDGET_ID!, token: env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN! }
    : null;

  return (
    <AppShell viewer={viewer} tab="account">
      {/* The language already chosen on the landing page comes with them, so
          the account is created reading the way they were reading. Onboarding
          asks again, with this as the answer already selected. */}
      {/* The review phone bypasses the MSG91 widget and uses the app's own
          OTP endpoints, which is where its fixed code lives. The number is
          not a secret; the code is, and the code stays on the server. */}
      <SignInFlow
        next={safeNext(next)}
        referralCode={ref ?? null}
        devMode={smsIsDev() && !widget}
        widget={widget}
        lang={await getLang()}
        reviewPhone={reviewPhone()}
      />
    </AppShell>
  );
}

/** Only ever redirect within this app. An open redirect is a phishing gift. */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
