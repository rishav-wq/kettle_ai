import Link from "next/link";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { ChatIcon } from "@/components/icons";
import { getSiteContent } from "@/lib/content/site";
import { getViewer } from "@/lib/viewer";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Help and common questions",
  description: "Find answers about Kettle AI lessons, safety, accounts, and learning practical AI skills on your phone.",
  pathname: "/help",
});

/**
 * Help.
 *
 * This audience calls rather than reads, so the page leads with a way to reach
 * a person. The written answers are the same ones the landing page carries,
 * read from one file, so they can never drift apart.
 */
export default async function HelpPage() {
  const viewer = await getViewer();
  const site = getSiteContent();
  const wa = site.contact.whatsapp ? `https://wa.me/${site.contact.whatsapp}` : null;

  const policies = [
    { href: "/legal/privacy", label: "Privacy policy" },
    { href: "/legal/terms", label: "Terms of use" },
    { href: "/legal/refunds", label: "Refunds and cancellation" },
    { href: "/legal/contact", label: "Contact us" },
  ];

  return (
    <AppShell
      viewer={viewer}
      tab="account"
      header={<GradHeader title="Help" subtitle="Talk to a person, or read the common questions." back={{ href: "/mine", label: "Back" }} />}
    >
      {/* Explicit placement rather than reordering, so the phone keeps the
          order that matters there — reach a person, then read, then policies —
          while desktop puts the long list of questions beside the short ones. */}
      <div className="flex flex-col gap-7 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start lg:gap-8">
        {wa ? (
          <Card className="flex flex-col gap-3 p-5 lg:col-start-2 lg:row-start-1">
            <h2 className="text-[1.1rem] font-bold">Talk to a person</h2>
            <p className="text-[0.92rem] text-ink-2">{site.contact.hours}</p>
            <Button href={wa} full>
              <ChatIcon className="h-5 w-5" />
              Message us on WhatsApp
            </Button>
          </Card>
        ) : null}

        <section className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <h2 className="text-[1.05rem] font-bold">Common questions</h2>
          <Card className="divide-y divide-line">
            {site.faq.map((f, i) => (
              <details key={i} className="group p-4">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-[0.96rem] font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{f.q}</span>
                  <span aria-hidden className="grid h-7 w-7 flex-none place-items-center rounded-pill bg-wash text-violet transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 pr-10 text-[0.9rem] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
          <h2 className="text-[1.05rem] font-bold">Policies</h2>
          <Card className="divide-y divide-line">
            {policies.map((p) => (
              <Link key={p.href} href={p.href} className="flex min-h-[56px] items-center gap-3 px-4 text-[0.95rem] font-medium">
                <span className="min-w-0 flex-1">{p.label}</span>
                <span aria-hidden className="flex-none text-ink-3">
                  ›
                </span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
