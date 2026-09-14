"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { post } from "@/lib/http";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/logo";
import type { Lang } from "@/lib/lang";
import { T } from "@/components/bilingual";

type Category = { id: string; nameHi: string; nameEn: string };

/**
 * Onboarding.
 *
 * Two questions, both skippable: which language to read in, and what to show
 * first. Language is asked here rather than left to the header toggle because
 * this is the one screen everybody passes through, and someone who reads only
 * Devanagari should not have to find a control in a script they cannot read.
 *
 * Both answers are held in local state and posted together on finish. The
 * header toggle cannot be reused here: it submits a server action that
 * revalidates the layout, which would throw away the category already chosen.
 *
 * "I am not sure yet" is a first-class answer rather than a way to opt out.
 * For someone who has never used AI, not knowing is the honest starting
 * position, and it routes them to the course that assumes nothing.
 */
export function OnboardingFlow({ name, categories, lang: initialLang }: { name: string; categories: Category[]; lang: Lang }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    // The route writes the language cookie as well as the row, so the next
    // screen renders in the language chosen here.
    await post("/api/onboarding", { lang, categoryId });
    router.replace("/learn");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-ground lg:max-w-none lg:items-center lg:justify-center lg:bg-wash lg:px-6 lg:py-10">
      <div className="flex flex-col lg:pointer-events-auto lg:relative lg:z-10 lg:w-full lg:max-w-[520px] lg:overflow-hidden lg:rounded-[28px] lg:bg-paper lg:shadow-l">
      <header className="grad rounded-b-[34px] px-5 pb-9 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:rounded-none lg:px-8 lg:pb-8 lg:pt-7">
        <div className="flex min-h-[44px] items-center">
          <Wordmark href="/" className="text-white" size="sm" tone="milk" />
          <button
            type="button"
            onClick={() => void finish()}
            className="ml-auto min-h-[44px] rounded-pill px-3 text-[0.88rem] font-semibold text-white/85 underline underline-offset-4 hover:text-white"
          >
            <T hi="छोड़िए" en="Skip" />
          </button>
        </div>
        <h1 className="mt-4 text-[1.8rem] font-bold leading-tight">
          {name ? <T hi={`नमस्ते, ${name} जी`} en={`Namaste, ${name} ji`} /> : <T hi="स्वागत है" en="Welcome" />}
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">
          <T hi="दो छोटे सवाल। दोनों बाद में बदल सकते हैं।" en="Two quick questions. You can change both later." />
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-6 lg:flex-none lg:px-8 lg:pb-9">
        <section className="flex flex-col gap-2.5" aria-labelledby="ob-lang">
          <h2 id="ob-lang" className="text-[1.05rem] font-bold">
            <T hi="आप किस भाषा में पढ़ना चाहेंगे?" en="Which language would you like to read in?" />
          </h2>
          {/* Each written in its own script. A label reading "Hindi" in Latin
              is no use to the person it is for. */}
          <div className="grid grid-cols-2 gap-2.5">
            <Choice selected={lang === "en"} onClick={() => setLang("en")} title="English" />
            <Choice selected={lang === "hi"} onClick={() => setLang("hi")} title="हिंदी" />
          </div>
          <p className="text-[0.85rem] leading-relaxed text-ink-3">
            <T
              hi="वीडियो दोनों हालत में हिंदी में ही हैं। इससे स्क्रीन पर लिखा हुआ बदलता है।"
              en="Videos are in Hindi either way. This changes the writing on screen."
            />
          </p>
        </section>

        <section className="mt-4 flex flex-col gap-2.5" aria-labelledby="ob-topic">
          <h2 id="ob-topic" className="text-[1.05rem] font-bold">
            <T hi="सबसे पहले AI किस काम में आपकी मदद करे?" en="What would you like AI to help you with first?" />
          </h2>
          <p className="text-[0.85rem] leading-relaxed text-ink-3">
            <T
              hi="इससे तय होता है कि हम पहले क्या दिखाएँ। बाकी सब बाद में देख सकते हैं।"
              en="This decides what we show first. You can explore everything later."
            />
          </p>
          {categories.map((c) => (
            <Choice
              key={c.id}
              selected={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              title={<T hi={c.nameHi} en={c.nameEn} />}
            />
          ))}
          <Choice
            selected={categoryId === null}
            onClick={() => setCategoryId(null)}
            title={<T hi="अभी तय नहीं है" en="I am not sure yet" />}
            sub={<T hi="हम आपको शुरुआत से शुरू कराएँगे" en="We will start you at the beginning" />}
          />
        </section>

        <div className="mt-auto pt-6">
          <Button full size="lg" disabled={busy} onClick={() => void finish()}>
            {busy ? <T hi="शुरू कर रहे हैं…" en="Getting started…" /> : <T hi="सीखना शुरू कीजिए" en="Start learning" />}
          </Button>
        </div>
      </main>
      </div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  title,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[68px] w-full items-center gap-4 rounded-tile bg-paper px-4 py-3 text-left shadow-s transition-shadow",
        selected ? "ring-2 ring-violet" : "hover:shadow-m"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-7 w-7 flex-none place-items-center rounded-pill text-[0.8rem] font-bold transition-colors",
          selected ? "bg-fill text-on-fill" : "bg-wash text-transparent"
        )}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block text-[1rem] font-semibold leading-snug">{title}</span>
        {sub ? <span className="mt-0.5 block text-[0.82rem] text-ink-3">{sub}</span> : null}
      </span>
    </button>
  );
}
