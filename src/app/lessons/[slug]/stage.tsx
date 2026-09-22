"use client";

import { stageClass } from "@/lib/video/embed";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Player } from "@/components/player";
import { Paywall } from "@/components/paywall";
import type { Playable } from "@/lib/video/embed";
import type { LockReason } from "@/lib/viewer";
import { T } from "@/components/bilingual";

type Props = {
  lessonId: string;
  locked: LockReason | null;
  playable: Playable;
  durationSec: number;
  startAtSec: number;
  tracking: boolean;
  signedIn: boolean;
  months: number;
  price: string;
  listPrice: string | null;
};

/**
 * Owns the one piece of client state the lesson page needs: whether the
 * paywall is open. It opens on arrival for a locked lesson, and mid-lesson
 * when the server says the fourth free lesson has just been finished.
 */
export function LessonStage({ lessonId, locked, playable, durationSec, startAtSec, tracking, signedIn, months, price, listPrice }: Props) {
  const [paywall, setPaywall] = useState<LockReason | null>(locked);

  if (locked) {
    return (
      <>
        <div
          className={cn(
            "relative grid place-items-center overflow-hidden rounded-card bg-violet-deep px-6 text-center shadow-l",
            stageClass(playable.portrait)
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-white/18 text-[1.4rem] backdrop-blur-sm">
              🔒
            </span>
            <p className="text-[0.95rem] font-medium text-white/90">
              {locked === "free_limit_reached" ? (
                <T hi="आपने चारों मुफ़्त lessons देख लिए हैं" en="You have used the four free lessons" />
              ) : (
                <T hi="यह lesson Gold सदस्यों के लिए है" en="This lesson is for Gold members" />
              )}
            </p>
          </div>
        </div>
        <div className="pt-4">
          <Button full size="lg" variant="onGrad" onClick={() => setPaywall(locked)}>
            <T hi="Gold सदस्य बनिए" en="Become a Gold member" />
          </Button>
        </div>
        <Paywall open={paywall !== null} onClose={() => setPaywall(null)} reason={paywall ?? locked} months={months} price={price} listPrice={listPrice} signedIn={signedIn} />
      </>
    );
  }

  return (
    <>
      <Player
        lessonId={lessonId}
        playable={playable}
        durationSec={durationSec}
        startAtSec={startAtSec}
        tracking={tracking}
        onFreeLimit={() => setPaywall("free_limit_reached")}
      />
      <Paywall
        open={paywall !== null}
        onClose={() => setPaywall(null)}
        reason={paywall ?? "free_limit_reached"}
        months={months}
        price={price}
        listPrice={listPrice}
        signedIn={signedIn}
      />
    </>
  );
}
