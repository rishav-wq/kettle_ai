import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdmin } from "@/lib/admin";
import { withTenant } from "@/lib/db/tenant";
import { PUBLIC_TENANT } from "@/lib/db/scope";
import { countFreeLessons, getAdminCourse } from "@/lib/content/admin-queries";
import { slug as slugSchema } from "@/lib/security/validators";
import { FREE_LESSON_LIMIT } from "@/app/api/admin/lessons/route";
import { CourseEditor } from "./editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Admin", robots: { index: false, follow: false } };

export default async function AdminCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  // Before anything is read. See the note in src/app/admin/page.tsx: the
  // layout's guard does not stop a page's data reaching the RSC payload.
  if (!(await getAdmin())) notFound();

  const { slug } = await params;
  // The slug is a path segment and reaches a query, so it is validated the same
  // way every other route validates its input rather than trusted for being in a URL.
  if (!slugSchema.safeParse(slug).success) notFound();

  const data = await withTenant(
    PUBLIC_TENANT,
    async (db) => ({ found: await getAdminCourse(db, slug), freeUsed: await countFreeLessons(db) }),
    { bypass: true }
  );
  if (!data.found) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="w-fit text-[0.88rem] font-semibold text-ink-3 underline underline-offset-4">
        ← All categories
      </Link>
      <CourseEditor
        course={data.found.course}
        categories={data.found.categories.map((c) => ({ id: c.id, nameEn: c.nameEn }))}
        freeUsed={data.freeUsed}
        freeLimit={FREE_LESSON_LIMIT}
      />
    </div>
  );
}
