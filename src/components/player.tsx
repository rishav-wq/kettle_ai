"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayIcon } from "@/components/icons";
import { post } from "@/lib/http";
import type { Playable } from "@/lib/video/embed";

type Props = {
  lessonId: string;
  playable: Playable;
  durationSec: number;
  startAtSec: number;
  /** Only signed-in viewers have progress to record. */
  tracking: boolean;
  onFreeLimit?: () => void;
};

const HEARTBEAT_MS = 15_000;

/**
 * The lesson player.
 *
 * The iframe loads only after the poster is tapped, so nothing from YouTube
 * touches the page, and no cookie is set, until someone chooses to watch. On a
 * metered connection that also means we do not spend the viewer's data before
 * they have decided to.
 *
 * Progress is a wall-clock estimate rather than the real playhead, because the
 * iframe API would mean loading YouTube's script on every lesson page. The
 * server clamps whatever we send to the true duration, so the worst case is a
 * slightly generous completion, not a forged one.
 */
export function Player({ lessonId, playable, durationSec, startAtSec, tracking, onFreeLimit }: Props) {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const elapsed = useRef(startAtSec);
  const notified = useRef(false);

  useEffect(() => {
    if (!playing || !tracking) return;

    const beat = async () => {
      elapsed.current = Math.min(elapsed.current + HEARTBEAT_MS / 1000, durationSec);
      const res = await post<{ completed: boolean; hitFreeLimit: boolean }>("/api/progress", {
        lessonId,
        positionSec: Math.round(elapsed.current),
      });
      if (!res.ok) return;
      if (res.body?.hitFreeLimit && !notified.current) {
        notified.current = true;
        onFreeLimit?.();
      }
      if (res.body?.completed) router.refresh();
    };

    const id = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [playing, tracking, lessonId, durationSec, router, onFreeLimit]);

  if (playable.kind === "pending") {
    return (
      <Frame>
        <p className="px-6 text-center text-[0.95rem] font-medium text-white/85">This video is being added.</p>
      </Frame>
    );
  }

  if (!playing) {
    const pct = durationSec > 0 ? Math.min(100, (startAtSec / durationSec) * 100) : 0;
    return (
      <Frame>
        {playable.kind === "iframe" && playable.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={playable.poster} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {playable.kind === "iframe" && playable.poster ? <div aria-hidden className="absolute inset-0 bg-violet-deep/35" /> : null}
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play lesson"
          className="group relative z-10 grid h-[84px] w-[84px] place-items-center rounded-full bg-violet/75 text-white shadow-l backdrop-blur-sm transition-transform hover:scale-105"
        >
          <PlayIcon className="ml-1 h-9 w-9" />
        </button>
        {pct > 0 ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25">
            <span className="block h-full bg-white" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </Frame>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-violet-deep shadow-l">
      <iframe
        src={`${playable.src}&autoplay=1`}
        title={playable.title}
        className="h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

/** The video surface: a deep violet card, so it sits inside the gradient header rather than fighting it. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-card bg-violet-deep shadow-l">{children}</div>
  );
}
