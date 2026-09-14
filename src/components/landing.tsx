import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ChatIcon, ShieldIcon, SearchIcon, PlayIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/logo";
import { CountUp } from "@/components/count-up";
import type { Faq } from "@/lib/content/site";
import type { ReactNode } from "react";
import { T } from "@/components/bilingual";

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
  /* ReactNode throughout: every one of these is copy, and copy comes in two
     languages as <T hi en />. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
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

/*
  The proof strip.

  Rishav set the first three figures as floors rather than letting the strip
  report the catalogue as it currently stands, which is one course and nine
  minutes. The numbers below are therefore claims, not counts: while the real
  figure is under the floor the floor is shown with a "+", and once the real
  figure passes it the real one takes over and the "+" goes.

  Two things follow from that, and they are the reason this is written down
  here rather than inlined:

  1. These are the only asserted numbers in the product. Testimonials, the
     teacher block and the social-proof popup all still read from real rows,
     and must keep doing so — the popup names actual members by name.
  2. Every floor is a number someone can be held to. Lower one the moment the
     real figure would embarrass it, and delete FLOOR entirely to go back to
     counting, which is all the rest of the file does.
*/
const FLOOR = { learners: 500, lessons: 10, minutes: 100, freeLessons: 4 };

export function Stats({ stats }: { stats: { courses: number; lessons: number; minutes: number; freeLessons: number; learners: number } }) {
  /*
    Four tiles, always four. The old strip hid any zero and sized its grid by
    what survived; with floors nothing is ever zero, so the row is fixed and
    the widths stop moving as the catalogue grows.
  */
  const items = [
    { key: "learners", real: stats.learners, floor: FLOOR.learners, label: <T hi="सीखने वाले" en="Learners" />, plus: true },
    { key: "lessons", real: stats.lessons, floor: FLOOR.lessons, label: <T hi="Lessons" en="Lessons" />, plus: true },
    { key: "minutes", real: stats.minutes, floor: FLOOR.minutes, label: <T hi="मिनट" en="Minutes" />, plus: true },
    /*
      No "+" on this one. Exactly four lessons are free — the seed script
      refuses any other count — so "4+" is the one figure here that could never
      come true, however long the catalogue runs. The floor only covers the
      gap while two of the four are still waiting for their video.
    */
    { key: "free", real: stats.freeLessons, floor: FLOOR.freeLessons, label: <T hi="मुफ़्त" en="Free" />, plus: false },
  ].map((s) => ({ ...s, shown: Math.max(s.real, s.floor), atFloor: s.plus && s.real < s.floor }));

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
      {items.map((s) => (
        <Card key={s.key} className="flex flex-col items-center gap-1 px-1 py-4 lg:py-8">
          <span className="text-[1.35rem] font-bold leading-none tabular-nums text-violet lg:text-[2.4rem]">
            <CountUp value={s.shown} />
            {s.atFloor ? "+" : ""}
          </span>
          <span className="text-[0.66rem] font-medium text-ink-3 lg:text-[0.75rem]">{s.label}</span>
        </Card>
      ))}
    </div>
  );
}

/*
  What the product teaches, as outcomes.

  The previous four described the lesson format rather than what anyone would
  be able to do afterwards — "start with your own words" and "learn in 5–6
  minutes" tell a reader nothing they can picture themselves doing. These name
  the task instead.
*/
export function WhatYouCanDo() {
  const items = [
    {
      Icon: ChatIcon,
      key: "messages",
      titleHi: "बेहतर संदेश लिखिए",
      titleEn: "Write better messages",
      bodyHi: "WhatsApp के जवाब, निमंत्रण, email और औपचारिक चिट्ठियाँ तैयार कीजिए।",
      bodyEn: "Create WhatsApp replies, invitations, emails, and formal letters.",
    },
    {
      Icon: SearchIcon,
      key: "plan",
      titleHi: "योजना जल्दी बनाइए",
      titleEn: "Plan things faster",
      bodyHi: "यात्रा, घर का कोई समारोह, सामान की सूची, या पूरे दिन की योजना बनाइए।",
      bodyEn: "Plan a trip, family function, shopping list, or your day.",
    },
    {
      Icon: PlayIcon,
      key: "understand",
      titleHi: "मुश्किल जानकारी समझिए",
      titleEn: "Understand difficult information",
      bodyHi: "AI से form, bill, निर्देश और अनजाने शब्द आसान भाषा में समझाने को कहिए।",
      bodyEn: "Ask AI to explain forms, bills, instructions, and unfamiliar words simply.",
    },
    {
      Icon: ShieldIcon,
      key: "safe",
      titleHi: "ऑनलाइन सुरक्षित रहिए",
      titleEn: "Stay safe online",
      bodyHi: "संदिग्ध संदेश पहचानिए, जानकारी जाँचिए, और सीखिए कि क्या कभी नहीं बताना चाहिए।",
      bodyEn: "Recognise suspicious messages, check information, and learn what never to share.",
    },
  ];
  return (
    <Section
      eyebrow={<T hi="AI से आप क्या कर सकते हैं" en="What you can do with AI" />}
      title={<T hi="रोज़ के छोटे काम बहुत आसान हो जाते हैं" en="Small everyday tasks become much easier" />}
      lead={
        <T
          hi="अपने फ़ोन पर AI इस्तेमाल करने के काम के तरीक़े — आसान हिंदी में, कदम दर कदम समझाए हुए।"
          en="Learn practical ways to use AI on your phone — explained step by step in simple Hindi."
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {items.map(({ Icon, key, titleHi, titleEn, bodyHi, bodyEn }) => (
          <Card key={key} className="flex gap-4 p-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-[16px] bg-wash text-violet">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.98rem] font-semibold leading-snug">
                <T hi={titleHi} en={titleEn} />
              </span>
              <span className="mt-1 block text-[0.87rem] leading-snug text-ink-3">
                <T hi={bodyHi} en={bodyEn} />
              </span>
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
    {
      n: 1,
      titleHi: "एक छोटा lesson देखिए",
      titleEn: "Watch one short lesson",
      bodyHi: "आसान समझ और एक सच्चा उदाहरण, यहीं से शुरुआत। खाते की ज़रूरत नहीं।",
      bodyEn: "Start with a simple explanation and a real example. No account is needed.",
    },
    {
      n: 2,
      titleHi: "अपने फ़ोन पर आज़माइए",
      titleEn: "Try it on your phone",
      bodyHi: "वही बात तुरंत इस्तेमाल कीजिए, अपनी रफ़्तार से।",
      bodyEn: "Use the same idea straight away, at your own pace.",
    },
    {
      n: 3,
      titleHi: "तैयार हों तब आगे बढ़िए",
      titleEn: "Keep learning when ready",
      bodyHi: "साइन इन तभी कीजिए जब आप चाहें कि Kettle आपकी प्रगति याद रखे।",
      bodyEn: "Sign in only if you want Kettle to remember your progress.",
    },
  ];
  return (
    <Section
      id={id}
      eyebrow={<T hi="यह कैसे चलता है" en="How it works" />}
      title={<T hi="एक बार में एक काम का AI हुनर" en="One useful AI skill at a time" />}
    >
      <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
        {steps.map((s) => (
          <Card key={s.n} className="flex gap-4 p-4">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[14px] bg-fill text-[0.95rem] font-bold text-on-fill tabular-nums">
              {s.n}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.98rem] font-semibold leading-snug">
                <T hi={s.titleHi} en={s.titleEn} />
              </span>
              <span className="mt-1 block text-[0.87rem] leading-snug text-ink-3">
                <T hi={s.bodyHi} en={s.bodyEn} />
              </span>
            </span>
          </Card>
        ))}
      </ol>
    </Section>
  );
}

export function FaqBlock({ id, items }: { id?: string; items: Faq[] }) {
  if (items.length === 0) return null;
  return (
    <Section
      id={id}
      eyebrow={<T hi="सवाल" en="Questions" />}
      title={<T hi="लोग आम तौर पर क्या पूछते हैं" en="What people usually ask" />}
    >
      {/* Two columns on a wide screen. One full-width accordion would put the
          toggle a long way from the question it belongs to, and a narrow one
          left a ragged edge against every other section. */}
      <div className="overflow-hidden rounded-card lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible">
        {items.map((f, i) => (
          <details key={i} className="group border-b border-line bg-paper p-4 last:border-b-0 lg:rounded-card lg:border-b-0 lg:p-5 lg:shadow-s" open={i === 0}>
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-[0.98rem] font-semibold [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <T hi={f.qHi ?? f.q} en={f.q} />
              </span>
              <span aria-hidden className="grid h-7 w-7 flex-none place-items-center rounded-pill bg-wash text-violet transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 max-w-[62ch] pr-10 text-[0.92rem] leading-relaxed text-ink-2">
              <T hi={f.aHi ?? f.a} en={f.a} />
            </p>
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
        <h2 className="text-[1.5rem] font-bold leading-tight">
          <T hi="एक काम के AI हुनर से शुरुआत कीजिए" en="Start with one useful AI skill" />
        </h2>
        <p className="max-w-[34ch] text-[0.95rem] leading-relaxed text-white/85">
          <T
            hi="पहला lesson कुछ ही मिनट का है, और आप बिना खाते के शुरू कर सकते हैं।"
            en="Your first lesson takes only a few minutes, and you can begin without an account."
          />
        </p>
        <Button href={href} variant="onGrad" size="lg" full className="lg:w-auto lg:min-w-[300px]">
          <T hi="देखना शुरू कीजिए" en="Start watching" />
        </Button>
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}`} className="mt-1 flex min-h-[44px] items-center gap-2 text-[0.88rem] font-semibold text-white/90 underline underline-offset-4">
            <ChatIcon className="h-[18px] w-[18px]" />
            <T hi="या WhatsApp पर हमसे पूछिए" en="Or ask us on WhatsApp" />
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
export function Footer({ whatsapp, hours, hoursHi }: { whatsapp: string | null; hours: string; hoursHi: string }) {
  /* aria-label on each nav needs a plain string, so every group carries both
     and the heading renders the pair. */
  const groups = [
    {
      key: "learn",
      titleHi: "सीखिए",
      titleEn: "Learn",
      links: [
        { href: "/learn", hi: "सभी कोर्स", en: "All courses" },
        { href: "#how", hi: "यह कैसे चलता है", en: "How it works" },
        { href: "#questions", hi: "सवाल", en: "Questions" },
      ],
    },
    {
      key: "account",
      titleHi: "खाता",
      titleEn: "Account",
      links: [
        { href: "/signin", hi: "साइन इन", en: "Sign in" },
        { href: "/gold", hi: "Kettle Gold", en: "Kettle Gold" },
        { href: "/mine", hi: "मेरी क्लास", en: "My classes" },
      ],
    },
    {
      key: "policies",
      titleHi: "नीतियाँ",
      titleEn: "Policies",
      links: [
        { href: "/legal/privacy", hi: "निजता", en: "Privacy" },
        { href: "/legal/terms", hi: "शर्तें", en: "Terms" },
        { href: "/legal/refunds", hi: "वापसी", en: "Refunds" },
        { href: "/legal/contact", hi: "संपर्क", en: "Contact" },
      ],
    },
  ];

  return (
    <footer className="mt-2 flex flex-col gap-10 border-t border-line pb-10 pt-10 lg:pb-16 lg:pt-14">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
        <div className="flex flex-col gap-4">
          <Wordmark href="/" size="sm" tone="pine" />
          <p className="max-w-[34ch] text-[0.88rem] leading-relaxed text-ink-2">
            <T
              hi="छोटे वीडियो में रोज़ के काम का AI, 40 से ऊपर के लोगों के लिए। चार पूरे lessons बिना खाते के मुफ़्त देखे जा सकते हैं।"
              en="Everyday AI in short videos, for people over 40. Four complete lessons are free to watch, with no account."
            />
          </p>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-pill bg-wash px-4 text-[0.86rem] font-semibold text-violet transition-colors hover:bg-line"
            >
              <ChatIcon className="h-[18px] w-[18px]" />
              <T hi="WhatsApp पर हमसे पूछिए" en="Ask us on WhatsApp" />
            </a>
          ) : null}
          {hours ? (
            <p className="text-[0.8rem] text-ink-3">
              <T hi={hoursHi || hours} en={hours} />
            </p>
          ) : null}
        </div>

        {groups.map((g) => (
          <nav key={g.key} aria-label={g.titleEn} className="flex flex-col gap-3">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-3">
              <T hi={g.titleHi} en={g.titleEn} />
            </h3>
            <ul className="flex flex-col gap-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-[36px] items-center text-[0.88rem] font-medium text-ink-2 transition-colors hover:text-violet">
                    <T hi={l.hi} en={l.en} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[0.8rem] text-ink-3">
          <T hi={`भारत में बना। © ${new Date().getFullYear()} Kettle.`} en={`Made in India. © ${new Date().getFullYear()} Kettle.`} />
        </p>
        <p className="max-w-[52ch] text-[0.8rem] leading-relaxed text-ink-3">
          <T
            hi="Kettle आपको कभी फ़ोन करके code, password या UPI PIN नहीं पूछेगा। अगर कोई पूछे, तो वह हम नहीं हैं।"
            en="Kettle will never telephone you to ask for a code, a password, or a UPI PIN. If someone does, it is not us."
          />
        </p>
      </div>
    </footer>
  );
}
