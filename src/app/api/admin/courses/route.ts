import { ForbiddenError, toErrorResponse } from "@/lib/security/request";
import { courseInput, deleteInput, parseBody, ValidationError } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import type { CategoryDoc, CourseDoc, LessonDoc } from "@/lib/db/documents";
import { adminPreamble } from "@/lib/admin";
import { audit } from "@/lib/audit";

/*
  Courses.

  tenantId is written as null, which is what makes a course global content
  every tenant can see. src/lib/db/collections.ts classifies courses as CONTENT
  for exactly this: a document with no tenant is everybody's. Writing it needs
  the bypass, the same way the seed script does, because the scoped handle
  would otherwise stamp the editing admin's tenant onto the catalogue and make
  it invisible to everyone else.
*/
export async function POST(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, courseInput);

    await withTenant(
      admin.tenantId,
      async (db) => {
        // A course filed under a category that does not exist renders nowhere
        // at all, because the Learn page walks categories.
        const category = await db.findOne<CategoryDoc>("categories", { id: body.categoryId });
        if (!category) throw new ValidationError("unknown_category");

        await db.updateOne<CourseDoc>(
          "courses",
          { id: body.id },
          {
            $set: {
              id: body.id,
              tenantId: null,
              categoryId: body.categoryId,
              titleHi: body.titleHi,
              titleEn: body.titleEn,
              descriptionHi: body.descriptionHi ?? null,
              descriptionEn: body.descriptionEn ?? null,
              imageUrl: body.imageUrl ?? null,
              sortOrder: body.sortOrder,
              isPublished: body.isPublished,
            },
          },
          { upsert: true }
        );
        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.course.saved",
          targetType: "course",
          targetId: body.id,
          ip,
          meta: { published: body.isPublished, category: body.categoryId },
        });
      },
      { bypass: true }
    );

    return Response.json({ ok: true, id: body.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Refuses while lessons remain, for the same reason a category refuses while courses remain. */
export async function DELETE(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, deleteInput);

    const blocked = await withTenant(
      admin.tenantId,
      async (db) => {
        const lessons = await db.find<LessonDoc>("lessons", { courseId: body.id });
        if (lessons.length > 0) return lessons.length;

        await db.deleteOne<CourseDoc>("courses", { id: body.id });
        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.course.deleted",
          targetType: "course",
          targetId: body.id,
          ip,
        });
        return 0;
      },
      { bypass: true }
    );

    if (blocked > 0) throw new ForbiddenError(`course_has_lessons:${blocked}`);
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
