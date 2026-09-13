import { redirect } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { GOLD, formatRupees } from "@/lib/payments/plan";
import { GOLD_INCLUDES } from "@/lib/payments/includes";
import { getViewer } from "@/lib/viewer";
import { GoldCta } from "./cta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle Gold" };

export default async function GoldPage() {
  const viewer = await getViewer();
  if (viewer.state === "gold") redirect("/invite");

  return (
    <AppShell
      viewer={viewer}
      tab="invite"
      header={
        <GradHeader title="Kettle Gold" subtitle="One payment. Nothing renews on its own." tall>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-[2.6rem] font-bold leading-none tabular-nums">{formatRupees(GOLD.amountPaise)}</span>
            <span className="text-[0.95rem] font-medium text-white/80">for {GOLD.months} months</span>
          </div>
        </GradHeader>
      }
    >
      {/* Two columns from lg: what you get on the left, the decision on the
          right. Previously this was capped at 620px inside a 1440px shell, so
          the price banner ran to the edge of the page and the card it was
          selling stopped halfway across. */}
      <div className="mt-6 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start lg:gap-7">
        <Card className="flex flex-col gap-3 p-5 lg:p-6">
          <h2 className="text-[1.05rem] font-bold">What you get</h2>
          <ul className="flex flex-col gap-2.5">
            {GOLD_INCLUDES.map((r) => (
              <li key={r} className="flex gap-3 text-[0.94rem] leading-snug text-ink-2">
                <span aria-hidden className="flex-none font-bold text-violet">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          <GoldCta price={formatRupees(GOLD.amountPaise)} months={GOLD.months} signedIn={Boolean(viewer.userId)} />

          <p className="px-2 text-center text-[0.84rem] leading-relaxed text-ink-3">
            Razorpay handles the payment. Kettle never sees your card. You can cancel inside the app.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
