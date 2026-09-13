/*
  The video registry's one job: turn a video asset into something the player
  can render. Lessons never know which provider they are on.

  YouTube today. When paid lessons move to signed playback, add a case here and
  change the rows in video_assets. No page changes.
*/

export type VideoAsset = { provider: "youtube" | "bunny" | "cloudflare"; providerRef: string };

/** A YouTube id: exactly eleven characters of this alphabet, nothing else. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The eleven character id out of whatever form the link was copied in.
 *
 * The content file is edited by hand and what you have in your hand is the
 * address bar, so this accepts a watch URL, a youtu.be short link, a /shorts/
 * or /embed/ path, or a bare id. Returns null for anything it cannot read,
 * which the seed treats as a mistake rather than guessing.
 *
 * Only the id is stored. A URL in the database would mean the query string —
 * a timestamp, a playlist, a tracking parameter — ends up inside the embed.
 */
export function youtubeId(input: string): string | null {
  const raw = input.trim();
  if (YOUTUBE_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const candidate =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")
        ? (url.searchParams.get("v") ?? url.pathname.replace(/^\/(embed|shorts|live|v)\//, ""))
        : "";

  return YOUTUBE_ID.test(candidate) ? candidate : null;
}

/** A stable YouTube preview image for course cards and lesson previews. */
export function youtubeThumbnail(
  provider: VideoAsset["provider"] | null,
  providerRef: string | null,
  quality: "hqdefault" | "maxresdefault" = "hqdefault",
): string | null {
  if (provider !== "youtube" || !providerRef || !YOUTUBE_ID.test(providerRef)) return null;
  return `https://i.ytimg.com/vi/${providerRef}/${quality}.jpg`;
}

export type Playable =
  | { kind: "iframe"; src: string; title: string; poster?: string }
  | { kind: "pending"; reason: string };

export function toPlayable(asset: VideoAsset | null, title: string): Playable {
  if (!asset) return { kind: "pending", reason: "no_asset" };
  if (asset.providerRef.startsWith("TODO")) return { kind: "pending", reason: "not_linked" };

  switch (asset.provider) {
    case "youtube": {
      if (!YOUTUBE_ID.test(asset.providerRef)) return { kind: "pending", reason: "bad_ref" };
      /*
        The player's own chrome and caption preference follow the interface,
        which is English. These said "hi" from before the English-only pivot,
        so a player embedded in an all-English page came up with Hindi controls
        and asked YouTube for Hindi captions that do not exist. The spoken
        audio is still Hinglish; that is a content decision, not this one.
      */
      const params = new URLSearchParams({
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
        hl: "en",
        cc_lang_pref: "en",
      });
      // youtube-nocookie keeps YouTube from setting tracking cookies until the viewer presses play.
      return {
        kind: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${asset.providerRef}?${params}`,
        title,
        poster: youtubeThumbnail("youtube", asset.providerRef) ?? undefined,
      };
    }
    case "bunny":
    case "cloudflare":
      // Signed playback arrives with the paid-video move. Until then these assets cannot render.
      return { kind: "pending", reason: "provider_not_wired" };
  }
}
