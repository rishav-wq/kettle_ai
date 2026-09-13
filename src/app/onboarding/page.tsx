import { redirect } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import type { CategoryDoc } from "@/lib/db/documents";
import { getViewer } from "@/lib/viewer";
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

  return <OnboardingFlow name={viewer.name ?? ""} categories={cats} />;
}
