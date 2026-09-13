import { z } from "zod";
import { eq } from "drizzle-orm";
import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { lang as langSchema, parseBody, slug } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import { categories, users } from "@/lib/db/schema";
import { getViewer } from "@/lib/viewer";

const Body = z.object({
  lang: langSchema,
  /** "not-sure" is a real answer, and the most honest one for a first-time user. */
  categoryId: slug.nullable(),
  city: z.string().trim().max(60).optional(),
});

/** Saves the two onboarding answers and marks the account onboarded. */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const body = await parseBody(req, Body);

    await withTenant(viewer.tenantId, async (tx) => {
      // Only accept a category that actually exists, so a crafted request cannot
      // write an arbitrary string into the user row.
      let categoryId: string | null = null;
      if (body.categoryId) {
        const [found] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, body.categoryId)).limit(1);
        categoryId = found?.id ?? null;
      }

      await tx
        .update(users)
        .set({
          lang: body.lang,
          preferredCategoryId: categoryId,
          city: body.city?.length ? body.city : null,
          onboardedAt: new Date(),
        })
        .where(eq(users.id, viewer.userId!));
    });

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
