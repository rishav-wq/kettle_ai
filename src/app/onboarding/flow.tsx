"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { post } from "@/lib/http";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/logo";

type Category = { id: string; nameHi: string; nameEn: string };

/**
 * Onboarding.
 *
 * One question, skippable. Language used to be the first step; the interface
 * is English only now, so all that remains is what to show first.
 *
 * "I am not sure yet" is a first-class answer rather than a way to opt out.
 * For someone who has never used AI, not knowing is the honest starting
 * position, and it routes them to the course that assumes nothing.
 */
export function OnboardingFlow({ name, categories }: { name: string; categories: Category[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    await post("/api/onboarding", { lang: "en", categoryId });
    router.replace("/learn");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-ground lg:max-w-none lg:items-center lg:justify-center lg:bg-wash lg:px-6 lg:py-10">
      <div className="flex flex-col lg:pointer-events-auto lg:relative lg:z-10 lg:w-full lg:max-w-[520px] lg:overflow-hidden lg:rounded-[28px] lg:bg-paper lg:shadow-l">
      <header className="grad rounded-b-[34px] px-5 pb-9 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:rounded-none lg:px-8 lg:pb-8 lg:pt-7">
        <div className="flex min-h-[44px] items-center">
          <Wordmark href="/" className="text-white" size="sm" />
          <button
            type="button"
            onClick={() => void finish()}
            className="ml-auto min-h-[44px] rounded-pill px-3 text-[0.88rem] font-semibold text-white/85 underline underline-offset-4 hover:text-white"
          >
            Skip
          </button>
        </div>
        <h1 className="mt-4 text-[1.8rem] font-bold leading-tight">{name ? `Hello, ${name}` : "Welcome"}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">What would you like AI to help you with first?</p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-6 lg:flex-none lg:px-8 lg:pb-9">
        <p className="text-[0.9rem] leading-relaxed text-ink-2">This helps us show the most useful lessons first. You can explore everything later.</p>

        <div className="mt-1 flex flex-col gap-2.5">
          {categories.map((c) => (
            <Choice key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} title={c.nameEn} />
          ))}
          <Choice selected={categoryId === null} onClick={() => setCategoryId(null)} title="I am not sure yet" sub="We will start you at the beginning" />
        </div>

        <div className="mt-auto pt-6">
          <Button full size="lg" disabled={busy} onClick={() => void finish()}>
            {busy ? "Getting started…" : "Start learning"}
          </Button>
        </div>
      </main>
      </div>
    </div>
  );
}

function Choice({ selected, onClick, title, sub }: { selected: boolean; onClick: () => void; title: string; sub?: string }) {
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
