import { redirect } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import type { CategoryDoc } from "@/lib/db/documents";
import { getViewer } from "@/lib/viewer";
import { getLang } from "@/lib/lang";
import { OnboardingFlow } from "./flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Welcome" };

export default async function OnboardingPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/signin?next=/onboarding");
  if (viewer.onboarded) redirect("/learn");

  const cats = await withTenant(viewer.tenantId, (db) =>
    db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 }, limit: 4 })
  );

  /*
    Only the fields the screen needs.

    A raw document carries Mongo's _id, which is a BSON ObjectId rather than a
    plain value, and React refuses to serialise it across the boundary into a
    client component. Picking the three fields out is also the honest interface:
    the flow does not want a database row, it wants three strings.
  */
  const categories = cats.map((c) => ({ id: c.id, nameHi: c.nameHi, nameEn: c.nameEn }));

  return <OnboardingFlow name={viewer.name ?? ""} categories={categories} lang={await getLang()} />;
}
