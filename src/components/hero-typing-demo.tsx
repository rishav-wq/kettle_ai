"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const examples = [
  {
    question: "Can AI help me write a letter?",
    answer: "Yes. Tell me who it is for and I’ll make a clear draft you can check.",
  },
  {
    question: "Can AI help plan a family function?",
    answer: "Yes. I can make a simple list, budget, and plan using what you already have.",
  },
  {
    question: "Is this message safe to open?",
    answer: "Let’s check it together. Never share an OTP, PIN, or password.",
  },
];

/*
  The product, shown rather than described.

  It fills whichever device frame wraps it, so the two variants differ only in
  spacing and in the chrome above the conversation: a phone gets a status bar,
  a laptop gets a browser bar. The conversation itself is one piece of markup.
*/
export function HeroTypingDemo({ variant = "phone" }: { variant?: "phone" | "laptop" }) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [answerVisible, setAnswerVisible] = useState(false);

  useEffect(() => {
    const example = examples[exampleIndex];
    let stopped = false;
    // Browsers share one id space for timeouts and intervals, so a single list
    // clears both on unmount.
    const timers: number[] = [];

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Everything is deferred by a tick. React forbids setting state
    // synchronously in an effect body, and doing so here would also reset the
    // bubbles during the same render that mounted them.
    timers.push(
      window.setTimeout(() => {
        if (stopped) return;

        if (reduced) {
          setQuestion(example.question);
          setAnswerVisible(true);
          return;
        }

        setQuestion("");
        setAnswerVisible(false);

        let cursor = 0;
        const typing = window.setInterval(() => {
          cursor += 1;
          setQuestion(example.question.slice(0, cursor));
          if (cursor < example.question.length) return;

          window.clearInterval(typing);
          timers.push(window.setTimeout(() => setAnswerVisible(true), 650));
          timers.push(
            window.setTimeout(() => {
              if (!stopped) setExampleIndex((current) => (current + 1) % examples.length);
            }, 4700)
          );
        }, 42);
        timers.push(typing);
      }, 0)
    );

    return () => {
      stopped = true;
      for (const t of timers) {
        window.clearTimeout(t);
        window.clearInterval(t);
      }
    };
  }, [exampleIndex]);

  const example = examples[exampleIndex];
  const laptop = variant === "laptop";

  return (
    <div className={cn("flex h-full w-full flex-col bg-wash text-ink", laptop ? "px-6 pb-5 pt-3" : "px-4 pb-3 pt-[13px]")}>
      {laptop ? <BrowserBar /> : <StatusBar />}

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className={cn("block font-bold", laptop ? "text-[1.05rem]" : "text-[0.94rem]")}>Ask Kettle</span>
            <span className="block text-[0.72rem] text-ink-3">Your simple AI guide</span>
          </div>
          <span className="rounded-pill bg-paper px-3 py-1 text-[0.68rem] font-semibold text-violet shadow-s">Ready to help</span>
        </div>

        <div className={cn("flex flex-col gap-3", laptop ? "mt-6" : "mt-5")}>
          <div
            className={cn(
              "ml-auto rounded-[18px] rounded-br-md bg-fill font-medium leading-snug text-on-fill shadow-s",
              laptop ? "min-h-[52px] max-w-[64%] px-4 py-3 text-[0.9rem]" : "min-h-[58px] max-w-[88%] px-4 py-3 text-[0.84rem]"
            )}
          >
            {question}
            <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-white align-[-0.1em]" />
          </div>

          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={cn(
                "grid flex-none place-items-center rounded-full bg-fill font-bold text-on-fill",
                laptop ? "h-9 w-9 text-[0.8rem]" : "h-8 w-8 text-[0.75rem]"
              )}
            >
              K
            </span>
            <div
              className={cn(
                "rounded-[18px] rounded-tl-md bg-paper leading-snug text-ink-2 shadow-s",
                laptop ? "min-h-[60px] max-w-[70%] px-4 py-3 text-[0.86rem]" : "min-h-[66px] max-w-[90%] px-4 py-3 text-[0.8rem]"
              )}
            >
              {answerVisible ? (
                example.answer
              ) : (
                <span className="inline-flex gap-1 pt-1" aria-label="Kettle is thinking">
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:-0.2s]" />
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:-0.1s]" />
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-[0.72rem] font-medium text-ink-3">
          <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-violet" /> Ask in your own words. No technical terms.
        </div>

        {/* A composer, so the screen reads as an app rather than a transcript.
            Inert on purpose: the real thing is one tap away in the hero button. */}
        <div className="flex items-center gap-2 rounded-pill bg-paper py-2 pl-4 pr-2 shadow-s">
          <span className="flex-1 truncate text-[0.8rem] text-ink-3">Type your question…</span>
          <span aria-hidden className="grid h-8 w-8 flex-none place-items-center rounded-full bg-fill text-[0.85rem] text-on-fill">
            ↑
          </span>
        </div>

        {/* The home indicator. Tiny, but its absence is what makes a drawn phone
            look like a drawing. */}
        {!laptop ? <span aria-hidden className="mx-auto mt-1 block h-[4px] w-[104px] rounded-pill bg-ink/25" /> : null}
      </div>
    </div>
  );
}

/** Phone status bar. Sits either side of the camera island. */
function StatusBar() {
  return (
    <div aria-hidden className="flex items-center justify-between px-1 text-[0.68rem] font-semibold text-ink">
      <span>9:41</span>
      <span className="flex items-center gap-1">
        {/* Signal, as four rising bars. */}
        <span className="flex items-end gap-[1.5px]">
          <i className="block h-[3px] w-[2px] rounded-[1px] bg-ink" />
          <i className="block h-[5px] w-[2px] rounded-[1px] bg-ink" />
          <i className="block h-[7px] w-[2px] rounded-[1px] bg-ink" />
          <i className="block h-[9px] w-[2px] rounded-[1px] bg-ink" />
        </span>
        <span className="ml-0.5 flex h-[9px] w-[16px] items-center rounded-[3px] border border-ink/45 p-[1.5px]">
          <i className="block h-full w-2/3 rounded-[1px] bg-ink" />
        </span>
      </span>
    </div>
  );
}

/** Laptop browser bar. Three dots and an address, which is all the eye needs. */
function BrowserBar() {
  return (
    <div aria-hidden className="-mx-6 flex items-center gap-3 border-b border-line px-6 pb-3">
      <span className="flex flex-none gap-1.5">
        <i className="block h-2.5 w-2.5 rounded-full bg-line" />
        <i className="block h-2.5 w-2.5 rounded-full bg-line" />
        <i className="block h-2.5 w-2.5 rounded-full bg-line" />
      </span>
      <span className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-pill bg-paper px-3 text-[0.72rem] text-ink-3">
        <span className="flex h-3 w-2.5 flex-none items-end justify-center rounded-[2px] border border-ink-3/60">
          <i className="mb-[1px] block h-[3px] w-[3px] rounded-full bg-ink-3" />
        </span>
        kettle.ai
      </span>
    </div>
  );
}
