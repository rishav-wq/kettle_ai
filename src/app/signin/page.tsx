import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { smsIsDev } from "@/lib/auth/sms";
import { widgetIsConfigured } from "@/lib/auth/msg91-widget";
import { env } from "@/lib/env";
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

  return <SignInFlow next={safeNext(next)} referralCode={ref ?? null} devMode={smsIsDev() && !widget} widget={widget} />;
}

/** Only ever redirect within this app. An open redirect is a phishing gift. */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
