import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, Tile } from "@/components/ui";
import {
  ClosingCta,
  FaqBlock,
  Footer,
  HowItWorks,
  Section,
  Stats,
  WhatYouCanDo,
} from "@/components/landing";
import { withTenant } from "@/lib/db/tenant";
import { getCatalog, getCatalogStats, getFreeLessons } from "@/lib/content/queries";
import { getSiteContent } from "@/lib/content/site";
import { getViewer } from "@/lib/viewer";
import { getLang } from "@/lib/lang";
import { T } from "@/components/bilingual";
import { HeroTypingDemo } from "@/components/hero-typing-demo";
import { LaptopFrame, PhoneFrame } from "@/components/device-frame";
import { Reveal } from "@/components/reveal";
import { SiteNav } from "@/components/site-nav";
import { SITE_NAME, pageMetadata, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Practical AI lessons for people over 40",
  description: "Learn how to use AI for everyday tasks, messages, letters, planning, and online safety in simple short videos.",
  pathname: "/",
});

/*
  One container recipe for the whole page.

  Every band, the full-bleed gradient hero included, puts its content inside
  this and nothing else carries a horizontal gutter. Padding on a band plus a
  max-width on its child resolves to a different left edge than a max-width on
  a wrapper plus padding on the same element, which is how the hero and the
  sections below it drifted out of line.
*/
const SHELL = "mx-auto w-full max-w-[1440px] px-5 lg:px-12";

/*
  The landing page.

  A full marketing page rather than a welcome screen: hero, proof, what you
  learn, the catalog, how it works, the safety promise, questions, and a
  closing call to action.

  Two things this page will not do. It never shows a countdown or a struck
  through price, because that is the visual grammar of the scams the first
  course warns about. And it never states a number it cannot count: the member
  figure appears only once real memberships exist.

  A signed-in visitor never sees this; they go straight into the app.
*/
export default async function Home() {
  const viewer = await getViewer();
  if (viewer.userId) redirect(viewer.onboarded ? "/learn" : "/onboarding");

  const lang = await getLang();
  const site = getSiteContent();
  const { free, stats, catalog } = await withTenant(viewer.tenantId, async (tx) => ({
    free: await getFreeLessons(tx),
    stats: await getCatalogStats(tx),
    catalog: await getCatalog(tx),
  }));

  const firstLesson = free[0] ? `/lessons/${free[0].id}` : "/learn";
  const featured = catalog.flatMap((c) => c.lessons).slice(0, 6);
  const whatsapp = site.contact.whatsapp || null;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${siteUrl("/").toString()}#organization`,
        name: SITE_NAME,
        url: siteUrl("/").toString(),
        description: "Practical AI lessons for people over 40.",
        areaServed: "IN",
        audience: { "@type": "PeopleAudience", suggestedMinAge: 40 },
        knowsAbout: ["artificial intelligence", "AI for beginners", "online safety", "everyday technology"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl("/").toString()}#website`,
        name: SITE_NAME,
        url: siteUrl("/").toString(),
        description: "Learn practical AI skills in short, simple videos.",
        inLanguage: "en-IN",
        publisher: { "@id": `${siteUrl("/").toString()}#organization` },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[520px] bg-ground lg:max-w-none">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      {/* Hero: one calm promise, one clear action, and a real preview of the product. */}
      {/* The band is full bleed; the gutter lives on the inner container only, so
          the hero's left edge lines up exactly with every section below it. */}
      <header className="grad relative overflow-hidden rounded-b-[38px] pb-10 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:rounded-b-[56px] lg:pb-20 lg:pt-8">
        <div aria-hidden className="drift pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className={SHELL}>
          <SiteNav firstLessonHref={firstLesson} lang={lang} />

          {/* Words left, illustration right, once there is room for both.
              The right column is wide enough to hold a laptop at a believable
              size; below lg the same demo appears in a phone instead. */}
          <div className="lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] lg:items-center lg:gap-16">
            <div className="flex flex-col">
              {/* The hero arrives in reading order, a beat apart. Plain CSS, so
                  it plays before React hydrates rather than after. */}
              <div className="mt-7 flex flex-col gap-4 lg:mt-0">
                <span
                  style={{ "--d": "0.05s" } as React.CSSProperties}
                  className="enter flex w-fit items-center gap-2 rounded-pill bg-white/12 px-3 py-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.13em] text-white/85"
                >
                  <span className="h-2 w-2 rounded-full bg-amber" /> <T hi="रोज़ के काम के लिए" en="Made for real life" />
                </span>
                <h1
                  style={{ "--d": "0.13s" } as React.CSSProperties}
                  className="enter max-w-[11ch] text-[2.55rem] font-bold leading-[1.08] lg:text-[4.25rem]"
                >
                  <T hi="अपने रोज़ के काम के लिए AI सीखिए" en="Learn AI for your everyday life." />
                </h1>
                <p
                  style={{ "--d": "0.22s" } as React.CSSProperties}
                  className="enter max-w-[34ch] text-[1rem] leading-relaxed text-white/85 lg:max-w-[40ch] lg:text-[1.12rem]"
                >
                  <T
                    hi="AI सिर्फ़ तकनीक के जानकारों के लिए नहीं है। आपके लिए भी है। 5–6 मिनट के आसान वीडियो — मैसेज लिखिए, यात्रा की योजना बनाइए, ईमेल भेजिए। शुरुआत से, अपने फ़ोन पर।"
                    en="AI isn’t only for tech experts. It’s for you too. Simple 5–6 minute videos — write messages, plan trips, send emails. Start from the basics, on your phone."
                  />
                </p>
              </div>

              <div style={{ "--d": "0.38s" } as React.CSSProperties} className="enter mt-8 lg:hidden">
                <PhoneFrame>
                  <HeroTypingDemo variant="phone" />
                </PhoneFrame>
              </div>

              <div
                style={{ "--d": "0.3s" } as React.CSSProperties}
                className="enter mt-7 flex flex-col gap-3 lg:mt-9 lg:max-w-[400px]"
              >
                <Button href={firstLesson} variant="onGrad" size="lg" full>
                  <T hi="एक मुफ़्त वीडियो देखिए" en="Watch a free lesson" /> <span aria-hidden>→</span>
                </Button>
                <p className="flex items-center justify-center gap-2 text-center text-[0.86rem] font-medium text-white/85 lg:justify-start lg:text-left">
                  <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[0.7rem]">✓</span>
                  <T hi="कोई साइन-अप नहीं। पहले 4 वीडियो के लिए कोई पैसा नहीं।" en="No sign-up. No payment for the first 4 videos." />
                </p>
              </div>
            </div>

            <div style={{ "--d": "0.28s" } as React.CSSProperties} className="enter hidden lg:block">
              <LaptopFrame>
                <HeroTypingDemo variant="laptop" />
              </LaptopFrame>
            </div>
          </div>
        </div>
      </header>

      {/* Each band below the fold rises into place as it is scrolled to. The
          wrapper is a plain block, so the flex column above is unchanged. */}
      <div className={`${SHELL} flex flex-col gap-12 pt-8 lg:gap-20 lg:pt-16`}>
        <Reveal>
          <Stats stats={stats} />
        </Reveal>

        <Reveal>
          <WhatYouCanDo />
        </Reveal>

        {/* The catalog, as a horizontal shelf so breadth is felt rather than claimed. */}
        <Reveal>
        <Section
          id="lessons"
          eyebrow={<T hi="Lessons" en="The lessons" />}
          title={<T hi="अपने दिन में फ़िट बैठने वाले lesson से शुरू कीजिए" en="Start with a lesson that fits your day" />}
        >
          <div className="no-bar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0">
            {featured.map((l) => (
              <Tile
                key={l.id}
                href={`/lessons/${l.id}`}
                image={l.imageUrl ?? undefined}
                title={<T hi={l.titleHi} en={l.titleEn} />}
                meta={<T hi={`${l.minutes} मिनट`} en={`${l.minutes} min`} />}
                badge={l.isFree ? <T hi="मुफ़्त" en="Free" /> : undefined}
                /* Signed-out visitors only reach this page — it redirects when
                   there is a session — so a paid lesson is always locked here. */
                locked={!l.isFree}
                className="w-[calc((100%-1rem)/2)] flex-none snap-start sm:w-[200px] lg:w-auto"
              />
            ))}
          </div>
          {/*
            The one place on this page that asks for an account, and it asks
            plainly. Four lessons play without signing in — the hero sends
            people there — so the whole catalogue is a fair thing to want a name
            for. Solid rather than soft: it is the second real decision offered
            on the page, and a ghost button read as a caption.
          */}
          <div className="flex flex-col items-center gap-2.5">
            <Button href="/signin?next=/learn" full size="lg" className="lg:w-auto lg:min-w-[280px]">
              <T hi="सभी lessons देखिए" en="Browse all lessons" /> <span aria-hidden>→</span>
            </Button>
            <p className="text-center text-[0.85rem] text-ink-3">
              <T hi="पहले 4 वीडियो बिना खाते के चलते हैं।" en="The first 4 videos play without an account." />
            </p>
          </div>
        </Section>
        </Reveal>

        <Reveal>
          <HowItWorks id="how" />
        </Reveal>

        <Reveal>
          <FaqBlock id="questions" items={site.faq} />
        </Reveal>

        <Reveal>
          <ClosingCta href={firstLesson} whatsapp={whatsapp} />
        </Reveal>

        <Reveal>
          <Footer
            whatsapp={whatsapp}
            hours={site.contact.hours}
            hoursHi={site.contact.hoursHi}
            email={site.business?.email ?? null}
            phone={site.business?.phone ?? null}
          />
        </Reveal>
      </div>
    </div>
  );
}
