import { toErrorResponse, ForbiddenError } from "@/lib/security/request";
import { categoryInput, deleteInput, parseBody } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import type { CategoryDoc, LessonDoc } from "@/lib/db/documents";
import { adminPreamble } from "@/lib/admin";
import { audit } from "@/lib/audit";

/*
  Categories.

  Upsert by id, because the id is the slug and the slug is the identity: an
  admin editing a name is editing the category, and an admin typing a new slug
  is making a new one. That is the same rule the seed script has always used,
  so the two cannot disagree about what a category is.
*/
export async function POST(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, categoryInput);

    await withTenant(
      admin.tenantId,
      async (db) => {
        await db.updateOne<CategoryDoc>(
          "categories",
          { id: body.id },
          {
            $set: {
              id: body.id,
              // Null means global content, visible to every tenant.
              tenantId: null,
              nameHi: body.nameHi,
              nameEn: body.nameEn,
              blurbHi: body.blurbHi ?? null,
              blurbEn: body.blurbEn ?? null,
              descriptionHi: body.descriptionHi ?? null,
              descriptionEn: body.descriptionEn ?? null,
              sortOrder: body.sortOrder,
            },
          },
          { upsert: true }
        );
        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.category.saved",
          targetType: "category",
          targetId: body.id,
          ip,
        });
      },
      { bypass: true }
    );

    return Response.json({ ok: true, id: body.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Deleting a category refuses while lessons still point at it.
 *
 * Cascading would take them with it, and a mistyped tap would silently remove
 * hours of filmed work. Orphaning them instead would leave lessons rendering
 * under no heading. Refusing is the only option that cannot lose anything, and
 * the message says what to move.
 */
export async function DELETE(req: Request) {
  try {
    const { admin, ip } = await adminPreamble(req);
    const body = await parseBody(req, deleteInput);

    const result = await withTenant(
      admin.tenantId,
      async (db) => {
        const lessons = await db.find<LessonDoc>("lessons", { categoryId: body.id });
        if (lessons.length > 0) return { blocked: lessons.length };

        await db.deleteOne<CategoryDoc>("categories", { id: body.id });
        await audit(db, {
          tenantId: admin.tenantId,
          actorUserId: admin.userId,
          action: "admin.category.deleted",
          targetType: "category",
          targetId: body.id,
          ip,
        });
        return { blocked: 0 };
      },
      { bypass: true }
    );

    if (result.blocked > 0) {
      throw new ForbiddenError(`category_has_lessons:${result.blocked}`);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
