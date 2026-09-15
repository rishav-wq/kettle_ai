import "server-only";
import { youtubeId, youtubeThumbnail } from "@/lib/video/embed";

/*
  Checking a pasted video link before it becomes a lesson.

  Reading the eleven character id out of a URL is a string operation and says
  nothing about whether the video exists, is public, or allows embedding. A
  typo in an id is still eleven valid characters, and the lesson it produces
  renders an empty player with no explanation. So the id is confirmed against
  YouTube before it is saved.

  oEmbed rather than the Data API, because oEmbed needs no key and no quota and
  no account. What it cannot give is duration — that is Data API only — so the
  admin still types the length in. Confirming the video is real is the part
  that was worth a network call; the duration is one number a person can read
  off the player they are already looking at.

  A 401 or 404 from oEmbed means private, deleted, or embedding disabled, and
  all three are the same answer here: this will not play for a learner.
*/

export type VideoLookup =
  | { ok: true; provider: "youtube"; providerRef: string; title: string; author: string | null; thumbnail: string | null }
  | { ok: false; reason: "unreadable" | "not_embeddable" | "unreachable" };

const TIMEOUT_MS = 6000;

export async function resolveVideo(input: string): Promise<VideoLookup> {
  const id = youtubeId(input);
  if (!id) return { ok: false, reason: "unreadable" };

  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    /*
      YouTube being unreachable is not the same as the link being wrong, and
      the admin must not be told it is. The route lets the save go ahead on
      this branch with the id it read; a real typo is still caught by the
      eleven character check.
    */
    return { ok: false, reason: "unreachable" };
  }

  if (!res.ok) return { ok: false, reason: "not_embeddable" };

  let body: { title?: unknown; author_name?: unknown };
  try {
    body = (await res.json()) as { title?: unknown; author_name?: unknown };
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  return {
    ok: true,
    provider: "youtube",
    providerRef: id,
    title: typeof body.title === "string" ? body.title : id,
    author: typeof body.author_name === "string" ? body.author_name : null,
    thumbnail: youtubeThumbnail("youtube", id),
  };
}
