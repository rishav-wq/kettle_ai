/*
  The video registry's one job: turn a video asset into something the player
  can render. Lessons never know which provider they are on.

  YouTube today. When paid lessons move to signed playback, add a case here and
  change the rows in video_assets. No page changes.
*/

export type VideoAsset = {
  provider: "youtube" | "bunny" | "cloudflare";
  providerRef: string;
  orientation?: "landscape" | "portrait";
};

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

/**
 * The stage, sized for the video rather than for 16:9.
 *
 * Portrait is bounded by height and landscape by width, which is the
 * constraint each one actually has. For portrait the width is capped so the
 * resulting height cannot exceed 68% of the viewport — a 9:16 box at full
 * phone width stands taller than the screen and pushes the lesson title out
 * of sight, which is the whole reason the landscape cap existed too.
 */
export function stageClass(portrait: boolean): string {
  return portrait
    /*
      Two caps, and the one that matters is the subtraction.

      What has to stay on screen below the video is the lesson title and the
      "N free lessons left" line: the title says which lesson this is, and
      seeing the card at all is what tells a reader there is a transcript
      under it. The things competing for that space are a fixed number of
      pixels, not a share of the screen — 16 of safe area, a 44px back row, a
      12px gap, 32px of panel padding, a 24px gap, a 96px card, and 96px of
      floating tab bar. That is 320px, so 20rem is reserved outright.

      The percentage is only the second cap, stopping the video dominating a
      tall screen where the subtraction alone would leave room for more.

      Both are needed. A percentage by itself was wrong twice: at 80% the
      title landed at 989px on a 956px screen, and even at 62% the tab bar
      still sat over the card on a shorter handset, because a proportion of a
      small screen is small while the tab bar is the same size on every one.
    */
    ? "mx-auto w-full max-w-[min(100%,calc((100dvh-18rem)*9/16),calc(62dvh*9/16))] sm:max-w-[min(100%,calc(68dvh*9/16))] aspect-[9/16]"
    : "mx-auto w-full max-w-[min(1080px,calc(66dvh*16/9))] aspect-video";
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
  | { kind: "iframe"; src: string; title: string; poster?: string; portrait: boolean }
  | { kind: "pending"; reason: string; portrait: boolean };

export function toPlayable(asset: VideoAsset | null, title: string): Playable {
  // A box that has not been told otherwise stays the shape it always was.
  const portrait = asset?.orientation === "portrait";

  if (!asset) return { kind: "pending", reason: "no_asset", portrait: false };
  if (asset.providerRef.startsWith("TODO")) return { kind: "pending", reason: "not_linked", portrait };

  switch (asset.provider) {
    case "youtube": {
      if (!YOUTUBE_ID.test(asset.providerRef)) return { kind: "pending", reason: "bad_ref", portrait };
      /*
        The player's own chrome and caption preference follow the interface,
        which is English. These said "hi" from before the English-only pivot,
        so a player embedded in an all-English page came up with Hindi controls
        and asked YouTube for Hindi captions that do not exist. The spoken
        audio is still Hinglish; that is a content decision, not this one.
      */
      /*
        What can actually be turned off.

        modestbranding used to shrink the YouTube wordmark and was removed
        here because it has done nothing since 2023 — YouTube deprecated it,
        and leaving it in suggests the chrome is under our control when it is
        not. The title, the channel avatar and the settings row belong to
        YouTube and cannot be styled or hidden from an embed at all.

        These four do still work: no related videos from other channels, no
        annotation cards, a white progress bar rather than red, and inline
        playback so iOS does not hijack the video into its own player.
      */
      const params = new URLSearchParams({
        rel: "0",
        iv_load_policy: "3",
        color: "white",
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
        portrait,
      };
    }
    case "bunny":
    case "cloudflare":
      // Signed playback arrives with the paid-video move. Until then these assets cannot render.
      return { kind: "pending", reason: "provider_not_wired", portrait };
  }
}
