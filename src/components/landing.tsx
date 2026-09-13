import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ChatIcon, ShieldIcon, SearchIcon, PlayIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/logo";
import type { Faq } from "@/lib/content/site";

/*
  Landing page sections.

  Split out so the page itself is just the ordering decision. Each section is a
  band: white card content on the near-white ground, with the gradient reserved
  for the hero and the closing call to action so it stays an event.
*/

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    /* No horizontal padding here. The page shell owns the gutter, so every
       section shares one left edge instead of each guessing its own. */
    <section id={id} className={cn("scroll-mt-8 flex flex-col gap-4 lg:gap-6", className)}>
      {eyebrow || title ? (
        <div className="flex flex-col gap-2">
          {eyebrow ? <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-violet">{eyebrow}</span> : null}
          {title ? <h2 className="text-[1.5rem] font-bold leading-tight lg:text-[2rem]">{title}</h2> : null}
          {lead ? <p className="text-[0.98rem] leading-relaxed text-ink-2">{lead}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The four numbers, all counted from the catalog so they are true on day one. */
export function Stats({ stats }: { stats: { courses: number; lessons: number; minutes: number; freeLessons: number; learners: number } }) {
  /*
    A zero is never shown. The member count already worked this way — no point
    announcing nobody has joined — and the same applies to the rest: before the
    first video is linked, an empty strip is honest and a row of zeroes is not.
    Each tile appears by itself as the number behind it becomes real.
  */
  const items = [
    { v: stats.courses, label: "Courses" },
    { v: stats.lessons, label: "Lessons" },
    { v: stats.minutes, label: "Minutes" },
    { v: stats.freeLessons, label: "Free" },
    { v: stats.learners, label: "Members" },
  ].filter((s) => s.v > 0);

  if (items.length === 0) return null;

  /*
    One row, always. The column count is the item count rather than a fixed
    four, because the member figure only appears once there are members: a
    hard `grid-cols-4` dropped that fifth tile onto a line of its own.

    Five equal columns at 360px leaves about 57px per tile, which the longest
    label ("Members") clears at this size.
  */
  return (
    <div
      className="grid gap-2 sm:gap-3 lg:gap-6"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((s) => (
        <Card key={s.label} className="flex flex-col items-center gap-1 px-1 py-4 lg:py-8">
          <span className="text-[1.35rem] font-bold leading-none tabular-nums text-violet lg:text-[2.4rem]">{s.v}</span>
          <span className="text-[0.66rem] font-medium text-ink-3 lg:text-[0.75rem]">{s.label}</span>
        </Card>
      ))}
    </div>
  );
}

/** What the product teaches, in plain tasks rather than technical features. */
export function WhatYouCanDo() {
  const items = [
    { Icon: ChatIcon, title: "Start with your own words", body: "Ask AI the way you would ask a helpful person. No technical terms needed." },
    { Icon: SearchIcon, title: "Save time on everyday tasks", body: "Use AI for messages, letters, plans, lists, travel, and other jobs on your phone." },
    { Icon: ShieldIcon, title: "Use AI safely", body: "Learn what to check, what AI can get wrong, and what private details to keep to yourself." },
    { Icon: PlayIcon, title: "Learn in 5–6 minutes", body: "One calm, practical video at a time. Watch it, try it, and come back when you are ready." },
  ];
  return (
    <Section eyebrow="What you will learn" title="Practical AI skills for everyday life">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {items.map(({ Icon, title, body }) => (
          <Card key={title} className="flex gap-4 p-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-[16px] bg-wash text-violet">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.98rem] font-semibold leading-snug">{title}</span>
              <span className="mt-1 block text-[0.87rem] leading-snug text-ink-3">{body}</span>
            </span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/** Three steps, numbered because the order genuinely matters. */
export function HowItWorks({ id }: { id?: string }) {
  const steps = [
    { n: 1, title: "Watch one short lesson", body: "Start with a simple explanation and a real example. No account is needed." },
    { n: 2, title: "Try it on your phone", body: "Use the same idea straight away, at your own pace." },
    { n: 3, title: "Keep learning when ready", body: "Sign in only if you want Kettle to remember your progress." },
  ];
  return (
    <Section id={id} eyebrow="How it works" title="One useful AI skill at a time">
      <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
        {steps.map((s) => (
          <Card key={s.n} className="flex gap-4 p-4">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[14px] bg-fill text-[0.95rem] font-bold text-on-fill tabular-nums">
              {s.n}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.98rem] font-semibold leading-snug">{s.title}</span>
              <span className="mt-1 block text-[0.87rem] leading-snug text-ink-3">{s.body}</span>
            </span>
          </Card>
        ))}
      </ol>
    </Section>
  );
}

/**
 * The safety promise.
 *
 * This product's first course is about spotting fraud, so the same standard
 * has to apply to the product. It sits high on the page rather than in the
 * footer for that reason.
 */
export function SafetyPromise() {
  const rules = [
    "We will never phone you and ask for a code, password, or PIN",
    "We explain where AI can make mistakes and what to check",
    "You can learn without sharing private documents or personal details",
  ];
  return (
    <Section className="pt-2">
      <Card className="grad-deep flex flex-col gap-4 p-6 text-white lg:p-10">
        <div className="flex items-center gap-3">
          <ShieldIcon className="h-7 w-7 flex-none" />
          <h2 className="text-[1.1rem] font-bold leading-snug">Learn AI with confidence</h2>
        </div>
        <ul className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-8">
          {rules.map((r) => (
            <li key={r} className="flex gap-3 text-[0.92rem] leading-snug text-white/90">
              <span aria-hidden className="flex-none font-bold">
                ✓
              </span>
              {r}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

export function Pricing({ price, months }: { price: string; months: number }) {
  const includes = ["Every lesson in every course", "Pick up where you left, on any phone", "No adverts, no popups", "Invite a friend, you both get a month"];
  return (
    <Section eyebrow="Pricing" title="One payment. Nothing renews on its own.">
      {/* Two columns on a wide screen: the offer on the left, what it contains
          on the right. A single narrow card left a ragged edge against every
          other section. */}
      <Card className="flex flex-col gap-6 p-6 lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:p-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[2.4rem] font-bold leading-none tabular-nums text-violet lg:text-[3rem]">{price}</span>
            <span className="text-[0.9rem] font-medium text-ink-3">for {months} months</span>
          </div>
          <Button href="/gold" full>
            See what Gold includes
          </Button>
          <p className="text-center text-[0.8rem] text-ink-3 lg:text-left">Four lessons stay free forever, with or without Gold.</p>
        </div>

        <ul className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-3.5">
          {includes.map((r) => (
            <li key={r} className="flex gap-3 text-[0.92rem] leading-snug text-ink-2">
              <span aria-hidden className="flex-none font-bold text-violet">
                ✓
              </span>
              {r}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

export function FaqBlock({ id, items }: { id?: string; items: Faq[] }) {
  if (items.length === 0) return null;
  return (
    <Section id={id} eyebrow="Questions" title="What people usually ask">
      {/* Two columns on a wide screen. One full-width accordion would put the
          toggle a long way from the question it belongs to, and a narrow one
          left a ragged edge against every other section. */}
      <div className="overflow-hidden rounded-card lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible">
        {items.map((f, i) => (
          <details key={i} className="group border-b border-line bg-paper p-4 last:border-b-0 lg:rounded-card lg:border-b-0 lg:p-5 lg:shadow-s" open={i === 0}>
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-[0.98rem] font-semibold [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">{f.q}</span>
              <span aria-hidden className="grid h-7 w-7 flex-none place-items-center rounded-pill bg-wash text-violet transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 max-w-[62ch] pr-10 text-[0.92rem] leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function ClosingCta({ href, whatsapp }: { href: string; whatsapp: string | null }) {
  return (
    <section>
      <div className="grad flex flex-col items-center gap-4 rounded-card px-6 py-10 text-center text-white shadow-l lg:py-16">
        <h2 className="text-[1.5rem] font-bold leading-tight">Start with one useful AI skill</h2>
        <p className="max-w-[34ch] text-[0.95rem] leading-relaxed text-white/85">Your first lesson takes only a few minutes, and you can begin without an account.</p>
        <Button href={href} variant="onGrad" size="lg" full className="lg:w-auto lg:min-w-[300px]">
          Start watching
        </Button>
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}`} className="mt-1 flex min-h-[44px] items-center gap-2 text-[0.88rem] font-semibold text-white/90 underline underline-offset-4">
            <ChatIcon className="h-[18px] w-[18px]" />
            Or ask us on WhatsApp
          </a>
        ) : null}
      </div>
    </section>
  );
}

/*
  The footer.

  Four columns on a wide screen, stacked on a phone. The safety line is here as
  well as in the promise block on purpose: a footer is where people go looking
  for who they are actually dealing with, and this audience is scam-targeted.
*/
export function Footer({ whatsapp, hours }: { whatsapp: string | null; hours: string }) {
  const groups: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
    {
      title: "Learn",
      links: [
        { href: "/learn", label: "All courses" },
        { href: "#how", label: "How it works" },
        { href: "#questions", label: "Questions" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/signin", label: "Sign in" },
        { href: "/gold", label: "Kettle Gold" },
        { href: "/mine", label: "My classes" },
      ],
    },
    {
      title: "Policies",
      links: [
        { href: "/legal/privacy", label: "Privacy" },
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/refunds", label: "Refunds" },
        { href: "/legal/contact", label: "Contact" },
      ],
    },
  ];

  return (
    <footer className="mt-2 flex flex-col gap-10 border-t border-line pb-10 pt-10 lg:pb-16 lg:pt-14">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
        <div className="flex flex-col gap-4">
          <Wordmark href="/" size="sm" />
          <p className="max-w-[34ch] text-[0.88rem] leading-relaxed text-ink-2">
            Everyday AI in short videos, for people over 40. Four complete lessons are free to watch, with no account.
          </p>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-pill bg-wash px-4 text-[0.86rem] font-semibold text-violet transition-colors hover:bg-line"
            >
              <ChatIcon className="h-[18px] w-[18px]" />
              Ask us on WhatsApp
            </a>
          ) : null}
          {hours ? <p className="text-[0.8rem] text-ink-3">{hours}</p> : null}
        </div>

        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title} className="flex flex-col gap-3">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-3">{g.title}</h3>
            <ul className="flex flex-col gap-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-[36px] items-center text-[0.88rem] font-medium text-ink-2 transition-colors hover:text-violet">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[0.8rem] text-ink-3">Made in India. © {new Date().getFullYear()} Kettle.</p>
        <p className="max-w-[52ch] text-[0.8rem] leading-relaxed text-ink-3">
          Kettle will never telephone you to ask for a code, a password, or a UPI PIN. If someone does, it is not us.
        </p>
      </div>
    </footer>
  );
}
