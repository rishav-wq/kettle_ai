import { z } from "zod";
import { LIMITS, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { parseBody, slug } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import type { CourseDoc, LessonDoc, VideoAssetDoc } from "@/lib/db/documents";
import { recordBeat } from "@/lib/content/progress";
import { FREE_LESSON_LIMIT, canWatch, getViewer } from "@/lib/viewer";

const Body = z.object({
  lessonId: slug,
  positionSec: z.number().int().min(0).max(60 * 60 * 12),
});

/**
 * Player heartbeat.
 *
 * Re-checks entitlement on every beat rather than trusting that the client only
 * plays what it was allowed to load, and takes the lesson duration from our own
 * database so a forged position cannot mark a lesson complete early.
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const body = await parseBody(req, Body);
    await enforceRate(`beat:${viewer.userId}`, LIMITS.progressBeat);

    const result = await withTenant(viewer.tenantId, async (db) => {
      const lesson = await db.findOne<LessonDoc>("lessons", { id: body.lessonId });
      if (!lesson) return { error: "not_found" as const };

      // The lesson only exists as far as this request is concerned if its
      // course is published and visible to this tenant. The INNER JOIN used to
      // say that; here it has to be asked for.
      const course = await db.findOne<CourseDoc>("courses", { id: lesson.courseId, isPublished: true });
      if (!course) return { error: "not_found" as const };

      const asset = lesson.videoAssetId ? await db.findOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId }) : null;
      if (!canWatch(viewer, lesson)) return { error: "locked" as const };

      const beat = await recordBeat(db, {
        tenantId: viewer.tenantId,
        userId: viewer.userId!,
        lessonId: lesson.id,
        positionSec: body.positionSec,
        durationSec: asset?.durationSec ?? 0,
        isFree: lesson.isFree,
        freeLimit: FREE_LESSON_LIMIT,
      });
      return { beat };
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.error === "locked" ? 403 : 404 });
    }
    return Response.json(result.beat);
  } catch (err) {
    return toErrorResponse(err);
  }
}
