import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { withTenant } from "@/lib/db/tenant";
import { getAdminCatalog } from "@/lib/content/admin-queries";
import { PUBLIC_TENANT } from "@/lib/db/scope";
import { FREE_LESSON_LIMIT } from "@/app/api/admin/lessons/route";
import { CatalogueEditor } from "./editor";

export const dynamic = "force-dynamic";

/*
  The catalogue, top level.

  Read with the public tenant and the bypass because the catalogue is global
  content: categories carry no tenant, and an admin editing from their own
  tenant would otherwise be shown nothing.

  The guard is repeated here, and it is not belt-and-braces — the layout's
  guard alone did not hold. A layout and its page render in parallel, so
  notFound() in the layout replaced the visible UI while this page had already
  run its query, and the whole catalogue, drafts included, went out inside the
  404's own RSC payload. The fix is to refuse before fetching: data that is
  never loaded cannot be serialised.
*/
export default async function AdminPage() {
  if (!(await getAdmin())) notFound();

  const catalog = await withTenant(PUBLIC_TENANT, getAdminCatalog, { bypass: true });
  return <CatalogueEditor catalog={catalog} freeLimit={FREE_LESSON_LIMIT} />;
}
