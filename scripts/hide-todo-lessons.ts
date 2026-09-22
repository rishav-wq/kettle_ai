/*
  Takes the unfilmed lessons off the learner's shelves.

    npx tsx --conditions=react-server scripts/hide-todo-lessons.ts          # dry run
    npx tsx --conditions=react-server scripts/hide-todo-lessons.ts --write  # apply

  Sixty-seven lessons were seeded so the shape of the product could be designed
  against something, and four have been filmed. The other sixty-three point at
  refs beginning TODO and render as "video being added", which is honest but is
  not a catalogue anyone should be shown.

  It unpublishes rather than deletes, and that is the whole design of it.

  Deleting would mean re-creating each lesson by hand as its video is shot —
  bilingual title, transcript, order, category, free flag — and losing the
  running order that was worked out when the curriculum was planned. Unpublished
  lessons vanish from Learn, because src/lib/content/queries.ts hides them,
  while admin-queries.ts still shows them: that split exists exactly so the
  operator can see work in progress that a learner must not. So /admin keeps the
  full list, and publishing one is a single toggle once its video exists.

  Every category keeps its first four lessons published, so each shelf still
  reads as four locked cards rather than an empty row. Lessons with a real video
  are never touched, whatever their position.

  Progress rows and the free-watch log are keyed by lesson id, and no id changes
  here, so nothing a learner has done is affected.
*/
import "./load-env";
import { getClient, getDb } from "../src/lib/db/mongo";

const WRITE = process.argv.includes("--write");

/** How many lessons each category keeps on the shelf. Matches SHELF in src/app/learn/page.tsx. */
const KEEP = 4;

async function main() {
  const db = await getDb();

  const cats = await db.collection("categories").find({}).sort({ sortOrder: 1 }).toArray();
  const lessons = await db.collection("lessons").find({}).sort({ sortOrder: 1 }).toArray();
  const assets = await db.collection("video_assets").find({}).toArray();

  const refById = new Map(assets.map((a) => [String(a.id), String(a.providerRef ?? "")]));
  const hasVideo = (l: Record<string, unknown>) => {
    const ref = refById.get(String(l.videoAssetId ?? ""));
    return Boolean(ref) && !ref!.startsWith("TODO");
  };

  console.log(WRITE ? "APPLYING\n" : "DRY RUN — nothing is written. Pass --write to apply.\n");

  /*
    Seeded fixtures pointing at videos belonging to other people.

    These are worse than a TODO ref. A TODO renders as "video being added";
    these play a stranger's video and put their frame on the card as its art,
    on a product teaching this audience to be careful about what they trust.
    Resetting the ref to TODO restores the honest state and lets the rest of
    this script treat the lesson as what it is: unfilmed.
  */
  const BORROWED = ["absqM6UWgWs"];
  const strangers = assets.filter((x) => BORROWED.includes(String(x.providerRef)));
  for (const x of strangers) {
    const owner = lessons.find((l) => l.videoAssetId === x.id);
    const on = owner ? String(owner.id) : "(unattached)";
    console.log(`borrowed video ${x.providerRef} on ${on}  ->  TODO`);
    if (WRITE) {
      await db.collection("video_assets").updateOne({ id: x.id }, { $set: { providerRef: `TODO-${on}` } });
    }
    refById.set(String(x.id), "TODO");
  }
  if (strangers.length) console.log("");

  const toHide: string[] = [];

  for (const c of cats) {
    const mine = lessons.filter((l) => l.categoryId === c.id).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
    const keep = new Set(mine.slice(0, KEEP).map((l) => String(l.id)));

    const hide = mine.filter((l) => !keep.has(String(l.id)) && !hasVideo(l) && l.isPublished);
    const filmed = mine.filter(hasVideo).length;

    console.log(
      `${String(c.id).padEnd(10)} ${String(mine.length).padStart(2)} lessons, ${filmed} filmed  ->  keeps ${Math.min(mine.length, KEEP)} on the shelf, hides ${hide.length}`
    );
    for (const l of hide) toHide.push(String(l.id));
  }

  console.log(`\n${toHide.length} lessons would be unpublished. They stay in /admin and keep their ids.`);

  if (!WRITE) {
    console.log("Nothing written.");
  } else {
    const res = await db.collection("lessons").updateMany({ id: { $in: toHide } }, { $set: { isPublished: false } });
    console.log(`Unpublished ${res.modifiedCount}.`);
  }

  const stillPublished = await db.collection("lessons").countDocuments({ isPublished: true });
  console.log(`Published after this: ${WRITE ? stillPublished : stillPublished - toHide.length}`);

  await (await getClient()).close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
