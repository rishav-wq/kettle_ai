/*
  Points the four free lessons at the four videos that actually exist.

    npx tsx --conditions=react-server scripts/set-first-course.ts          # dry run
    npx tsx --conditions=react-server scripts/set-first-course.ts --write  # apply

  The catalogue was seeded with 67 lessons so the shape of the product could be
  designed against something. Four videos have now been shot, and until this ran
  the first category played three unrelated videos someone else made: the cards
  carried their thumbnails, which is how it was noticed.

  Titles move with the videos. A card reading "Which AI apps should I know?" that
  plays a lesson about talking to AI is worse than either being wrong on its own,
  because the reader trusts the card and then doubts themselves.

  Transcripts move with the videos too, and are cleared where nothing matches.
  A transcript is read as what was said; one describing a different lesson is a
  fabrication, not a placeholder. content/kettle-content.json still holds every
  original, so nothing here is lost.

  Orientation comes from the video's own pixel dimensions, read off the watch
  page: all four are 2160x3840, so all four are portrait. stageClass reads this
  to size the frame.

  The first attempt asked whether youtube.com/shorts/<id> redirects, and got
  three of the four wrong. That test does not measure shape. A video over three
  minutes is never classified as a Short however it was filmed, and three of
  these run past four minutes — so they answered like landscape videos while
  being 9:16, and were framed as landscape until Rishav said the shelf looked
  inconsistent. Ask the file how big it is; do not ask YouTube what it calls it.

  Durations are the real lengthSeconds from each watch page, not the seeded
  round numbers, because the card prints them.
*/
import "./load-env";
import { getClient, getDb } from "../src/lib/db/mongo";

const WRITE = process.argv.includes("--write");

type Target = {
  sortOrder: number;
  providerRef: string;
  orientation: "portrait" | "landscape";
  durationSec: number;
  titleEn: string;
  titleHi: string;
  /** Which existing lesson's transcript belongs with this video, by sortOrder. Null clears it. */
  transcriptFrom: number | null;
};

const TARGETS: Target[] = [
  {
    sortOrder: 1,
    providerRef: "xf5Ud01jrlg",
    orientation: "portrait",
    durationSec: 171,
    titleEn: "What is AI, and why should I care?",
    titleHi: "AI क्या है, और यह आपके किस काम आएगा?",
    transcriptFrom: 1,
  },
  {
    sortOrder: 2,
    providerRef: "TJprkNM_epk",
    orientation: "portrait",
    durationSec: 247,
    titleEn: "How to talk to AI",
    titleHi: "AI से बात कैसे कीजिए",
    /*
      Was 3, the lesson this video's transcript was written for. The move has
      happened, so it is 2 now: re-running must not read lesson 3 again, which
      is empty since its own transcript went with a video that no longer sits
      there. A migration that destroys on second run is a trap for whoever
      reaches for it next.
    */
    transcriptFrom: 2,
  },
  {
    sortOrder: 3,
    providerRef: "QPW-TLSua7I",
    orientation: "portrait",
    durationSec: 247,
    titleEn: "Digital fraud, and where AI comes into it",
    titleHi: "Digital fraud, और उसमें AI कहाँ आता है",
    transcriptFrom: null,
  },
  {
    sortOrder: 4,
    providerRef: "tAbkikHYC2Q",
    orientation: "portrait",
    durationSec: 286,
    titleEn: "Where AI helps in real life, and what next",
    titleHi: "असल ज़िंदगी में AI कहाँ काम आता है, और आगे क्या",
    transcriptFrom: null,
  },
];

async function main() {
  const db = await getDb();

  const lessons = await db.collection("lessons").find({ categoryId: "start" }).sort({ sortOrder: 1 }).toArray();
  const free = lessons.filter((l) => l.isFree);

  if (free.length !== 4) {
    console.error(`Expected exactly four free lessons, found ${free.length}. Refusing.`);
    process.exit(1);
  }

  /* Transcripts are read before anything is written, so a move cannot read a value this run already replaced. */
  const transcripts = new Map(
    lessons.map((l) => [Number(l.sortOrder), { en: String(l.transcriptEn ?? ""), hi: String(l.transcriptHi ?? "") }])
  );

  console.log(WRITE ? "APPLYING\n" : "DRY RUN — nothing is written. Pass --write to apply.\n");

  for (const t of TARGETS) {
    const lesson = lessons.find((l) => Number(l.sortOrder) === t.sortOrder && l.isFree);
    if (!lesson) {
      console.error(`  no free lesson at sortOrder ${t.sortOrder}, skipping`);
      continue;
    }

    const asset = await db.collection("video_assets").findOne({ id: lesson.videoAssetId });
    const moved = t.transcriptFrom === null ? { en: "", hi: "" } : (transcripts.get(t.transcriptFrom) ?? { en: "", hi: "" });

    console.log(`  ${t.sortOrder}. ${lesson.id}`);
    console.log(`     video       ${asset?.providerRef ?? "(none)"}  ->  ${t.providerRef}`);
    console.log(`     shape       ${asset?.orientation ?? "(none)"}  ->  ${t.orientation}`);
    console.log(`     duration    ${asset?.durationSec ?? "?"}s  ->  ${t.durationSec}s`);
    console.log(`     title       ${String(lesson.titleEn)}`);
    if (String(lesson.titleEn) !== t.titleEn) console.log(`                 ->  ${t.titleEn}`);
    console.log(
      `     transcript  ${t.transcriptFrom === null ? "cleared (nothing written for this video yet)" : t.transcriptFrom === t.sortOrder ? "unchanged" : `taken from lesson ${t.transcriptFrom}`}`
    );
    /*
      The card art is the video's own thumbnail, and imageUrl overrides it. The
      seeded placeholder SVG has to go or the real frame never shows.
    */
    console.log(`     card art    ${lesson.imageUrl ?? "(none)"}  ->  the video's thumbnail`);
    console.log("");

    if (!WRITE) continue;

    await db
      .collection("video_assets")
      .updateOne(
        { id: lesson.videoAssetId },
        { $set: { provider: "youtube", providerRef: t.providerRef, orientation: t.orientation, durationSec: t.durationSec } }
      );

    await db.collection("lessons").updateOne(
      { id: lesson.id },
      {
        $set: {
          titleEn: t.titleEn,
          titleHi: t.titleHi,
          transcriptEn: moved.en,
          transcriptHi: moved.hi,
        },
        $unset: { imageUrl: "" },
      }
    );
  }

  console.log(WRITE ? "Done." : "Nothing written.");
  await (await getClient()).close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
