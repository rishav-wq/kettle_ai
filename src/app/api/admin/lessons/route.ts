import { randomUUID } from "node:crypto";
import { ForbiddenError, toErrorResponse } from "@/lib/security/request";
import { deleteInput, lessonInput, parseBody, ValidationError } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import type { CategoryDoc, LessonDoc, ProgressDoc, VideoAssetDoc } from "@/lib/db/documents";
import { youtubeId } from "@/lib/video/embed";
import { adminPreamble } from "@/lib/admin";
import { audit } from "@/lib/audit";

/** The product's central invariant. The seed script enforces it too. */
export const FREE_LESSON_LIMIT = 4;

export async function POST(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, lessonInput);

    /*
      A link that cannot be read is a typo, and a typo that saves quietly
      becomes a lesson rendering "video being added" with nothing to say why.
      Same rule the seed has: refuse rather than guess.

      Anything starting with TODO is the deliberate way to say "filmed later",
      so it passes through untouched and the player explains itself.
    */
    const ref = body.video.startsWith("TODO") ? body.video : youtubeId(body.video);
    if (!ref) throw new ValidationError("unreadable_video", { video: ["This is not a YouTube link we can read"] });

    const outcome = await withTenant(
      admin.tenantId,
      async (db) => {
        const category = await db.findOne<CategoryDoc>("categories", { id: body.categoryId });
        if (!category) throw new ValidationError("unknown_category");

        const existing = await db.findOne<LessonDoc>("lessons", { id: body.id });

        /*
          Exactly four lessons are free, and the whole top of the funnel is
          built on it: the landing page says four, the paywall counts to four,
          the seed refuses any other number.

          Checked as "would this write take it past four" rather than "is it
          four now", so an admin can unset one and set another in either order.
          Editing a lesson that is already free is not a new free lesson, which
          is what the id comparison is for.
        */
        if (body.isFree && !existing?.isFree) {
          const free = await db.find<LessonDoc>("lessons", { isFree: true });
          if (free.length >= FREE_LESSON_LIMIT) return { tooManyFree: free.length as number };
        }

        /*
          One video asset per lesson, reused if the lesson already has one.
          Creating a new asset on every save would leave the old rows behind
          with nothing pointing at them.
        */
        const assetId = existing?.videoAssetId ?? randomUUID();
        await db.updateOne<VideoAssetDoc>(
          "video_assets",
          { id: assetId },
          { $set: { id: assetId, provider: "youtube", providerRef: ref, durationSec: body.durationSec } },
          { upsert: true }
        );

        await db.updateOne<LessonDoc>(
          "lessons",
          { id: body.id },
          {
            $set: {
              id: body.id,
              categoryId: body.categoryId,
              sortOrder: body.sortOrder,
              titleHi: body.titleHi,
              titleEn: body.titleEn,
              videoAssetId: assetId,
              transcriptHi: body.transcriptHi ?? null,
              transcriptEn: body.transcriptEn ?? null,
              isFree: body.isFree,
              isPublished: body.isPublished,
              imageUrl: body.imageUrl ?? null,
            },
          },
          { upsert: true }
        );

        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.lesson.saved",
          targetType: "lesson",
          targetId: body.id,
          ip,
          meta: { category: body.categoryId, ref, free: body.isFree, published: body.isPublished },
        });

        return { tooManyFree: 0 };
      },
      { bypass: true }
    );

    if (outcome.tooManyFree > 0) throw new ForbiddenError(`free_limit:${outcome.tooManyFree}`);
    return Response.json({ ok: true, id: body.id, providerRef: ref });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Deleting a lesson takes its video asset with it, and refuses if anyone has
 * watched it.
 *
 * The asset belongs to the lesson and nothing else can reach it, so leaving it
 * would only accumulate rows. Progress is different: it belongs to a learner,
 * and deleting a lesson somebody has watched silently rewrites their history
 * and their free-lesson count. That is a decision for a person, not a tap.
 */
export async function DELETE(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, deleteInput);

    const watched = await withTenant(
      admin.tenantId,
      async (db) => {
        const seen = await db.countDocuments<ProgressDoc>("progress", { lessonId: body.id });
        if (seen > 0) return seen;

        const lesson = await db.findOne<LessonDoc>("lessons", { id: body.id });
        if (lesson?.videoAssetId) await db.deleteOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId });
        await db.deleteOne<LessonDoc>("lessons", { id: body.id });

        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.lesson.deleted",
          targetType: "lesson",
          targetId: body.id,
          ip,
        });
        return 0;
      },
      { bypass: true }
    );

    if (watched > 0) throw new ForbiddenError(`lesson_watched:${watched}`);
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
