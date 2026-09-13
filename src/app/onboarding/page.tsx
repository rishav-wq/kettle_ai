import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { categories } from "@/lib/db/schema";
import { getViewer } from "@/lib/viewer";
import { OnboardingFlow } from "./flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Welcome" };

export default async function OnboardingPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/signin?next=/onboarding");
  if (viewer.onboarded) redirect("/learn");

  const cats = await withTenant(viewer.tenantId, (tx) =>
    tx.select({ id: categories.id, nameHi: categories.nameHi, nameEn: categories.nameEn }).from(categories).orderBy(asc(categories.sortOrder)).limit(4)
  );

  return <OnboardingFlow name={viewer.name ?? ""} categories={cats} />;
}
