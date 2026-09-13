import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { LIMITS, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { parseBody, slug } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import { courses, lessons, videoAssets } from "@/lib/db/schema";
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

    const result = await withTenant(viewer.tenantId, async (tx) => {
      const [lesson] = await tx
        .select({ id: lessons.id, isFree: lessons.isFree, durationSec: videoAssets.durationSec })
        .from(lessons)
        .innerJoin(courses, and(eq(courses.id, lessons.courseId), eq(courses.isPublished, true)))
        .leftJoin(videoAssets, eq(videoAssets.id, lessons.videoAssetId))
        .where(eq(lessons.id, body.lessonId))
        .limit(1);

      if (!lesson) return { error: "not_found" as const };
      if (!canWatch(viewer, lesson)) return { error: "locked" as const };

      const beat = await recordBeat(tx, {
        tenantId: viewer.tenantId,
        userId: viewer.userId!,
        lessonId: lesson.id,
        positionSec: body.positionSec,
        durationSec: lesson.durationSec ?? 0,
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
