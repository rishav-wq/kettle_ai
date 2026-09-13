import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Button, Card, LessonRow } from "@/components/ui";
import { withTenant } from "@/lib/db/tenant";
import { PUBLIC_TENANT, users } from "@/lib/db/schema";
import { lookupReferrer } from "@/lib/referral";
import { getFreeLessons } from "@/lib/content/queries";
import { Wordmark } from "@/components/logo";

export const dynamic = "force-dynamic";

/**
 * Where a WhatsApp invite lands.
 *
 * The highest-traffic entry point in the growth plan, so it does one job: say
 * who invited you, then let you watch something immediately. The code is
 * carried into sign in, but nothing is gated behind claiming it.
 *
 * An unknown code is not an error page. Someone mistyped, or a member left,
 * and either way the right response is the ordinary landing page.
 */
export default async function ReferralLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) redirect("/");

  const { inviter, free } = await withTenant(PUBLIC_TENANT, async (tx) => {
    const ref = await lookupReferrer(tx, clean);
    if (!ref) return { inviter: null, free: await getFreeLessons(tx) };
    const [u] = await tx.select({ name: users.name, city: users.city }).from(users).where(eq(users.id, ref.userId)).limit(1);
    return { inviter: u ?? null, free: await getFreeLessons(tx) };
  });

  if (!inviter) redirect("/");

  const firstName = (inviter.name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-ground lg:max-w-[720px]">
      <header className="grad rounded-b-[34px] px-5 pb-10 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:mt-8 lg:rounded-[28px] lg:px-10 lg:pb-12 lg:pt-8">
        <Wordmark href="/" className="text-white" size="sm" />
        <p className="mt-6 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white/70">An invitation</p>
        <h1 className="mt-2 text-[1.9rem] font-bold leading-tight">
          {firstName ? `${firstName} invited you to Kettle` : "You have been invited to Kettle"}
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-white/85">
          Everyday AI in short videos. The first four lessons are free, with no account.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-12 pt-7 lg:px-0">
        <div className="flex flex-col gap-2.5">
          {free[0] ? (
            <Button href={`/lessons/${free[0].id}`} size="lg" full>
              Watch the first lesson
            </Button>
          ) : null}
          <Button href={`/signin?ref=${clean}`} variant="soft" full>
            Sign in with code {clean}
          </Button>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[1.05rem] font-bold">Free lessons</h2>
          <div className="flex flex-col gap-2.5">
            {free.map((l, i) => (
              <LessonRow
                key={l.id}
                index={i + 1}
                title={l.titleEn}
                meta={`${l.courseTitleEn} · ${Math.max(1, Math.round(l.durationSec / 60))} min`}
                href={`/lessons/${l.id}`}
              />
            ))}
          </div>
        </section>

        <Card className="p-5">
          <p className="text-[0.9rem] leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">Kettle will never call you</strong> and ask for a code. If someone does, that is a scam.
          </p>
        </Card>
      </main>
    </div>
  );
}
