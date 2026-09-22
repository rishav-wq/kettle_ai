import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import { GOLD } from "@/lib/payments/plan";
import { Price } from "@/components/price";
import { GOLD_INCLUDES } from "@/lib/payments/includes";
import { getViewer } from "@/lib/viewer";
import { GoldCta } from "./cta";
import { T } from "@/components/bilingual";

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
        /*
          Gold rather than Pine, and the only place in the product that is —
          but the same panel as everywhere else, so it runs to the edge of the
          phone with a rounded bottom instead of floating as an inset card with
          the page showing around its corners.
        */
        <GradHeader
          tone="gold"
          eyebrow="Kettle Gold"
          title={<T hi="हर lesson खोल लीजिए" en="Open every lesson" />}
          subtitle={<T hi="एक बार का payment। अपने आप कुछ भी दोबारा नहीं कटता।" en="One payment. Nothing renews on its own." />}
        >
          <Price size="page" />
        </GradHeader>
      }
    >
      {/* Two columns from lg: what you get on the left, the decision on the
          right. Previously this was capped at 620px inside a 1440px shell, so
          the price banner ran to the edge of the page and the card it was
          selling stopped halfway across. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start lg:gap-7">
        {/* Warmed and outlined, so the list of benefits reads as part of the
            same object as the panel above it rather than a white card that
            happens to sit under it. */}
        <Card className="flex flex-col gap-3 border border-gold-line bg-gold-wash p-5 lg:p-6">
          <h2 className="text-[1.05rem] font-bold">
            <T hi="आपको क्या मिलता है" en="What you get" />
          </h2>
          <ul className="flex flex-col gap-2.5">
            {GOLD_INCLUDES.map((r) => (
              <li key={r.en} className="flex gap-3 text-[0.94rem] leading-snug text-ink-2">
                <span aria-hidden className="flex-none font-bold text-gold-deep">
                  ✓
                </span>
                <T hi={r.hi} en={r.en} />
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          <GoldCta months={GOLD.months} signedIn={Boolean(viewer.userId)} />

          <p className="flex items-center justify-center gap-1.5 px-2 text-center text-[0.84rem] leading-relaxed text-ink-3">
            <ShieldIcon className="h-4 w-4 flex-none text-gold-deep" />
            <T hi="Payment Razorpay के ज़रिए होता है।" en="Payment processed by Razorpay." />
          </p>

          {/* Two of the five benefits above are things a person does rather
              than things the app does. A buyer should be able to see when and
              where, before paying, rather than after. */}
          <p className="px-2 text-center text-[0.84rem] leading-relaxed text-ink-3">
            <T
              hi="live session और support का समय मदद पेज पर देखिए।"
              en="The live session times and how support works are on the help page."
            />{" "}
            <Link href="/help" className="font-semibold underline underline-offset-4">
              <T hi="मदद पेज" en="Help page" />
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
