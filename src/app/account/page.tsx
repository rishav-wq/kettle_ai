import { redirect } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getViewer } from "@/lib/viewer";
import { getLang } from "@/lib/lang";
import { AccountForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/signin?next=/account");

  const me = await withTenant(viewer.tenantId, (db) => db.findOne<UserDoc>("users", { id: viewer.userId! }));

  return (
    <AppShell viewer={viewer} tab="account" header={<GradHeader title="Account" back={{ href: "/mine", label: "My classes" }} />}>
      {/* A form has a natural measure: a name field a thousand pixels wide is
          harder to use, not easier. */}
      <div className="lg:max-w-[640px]">
        <AccountForm name={me?.name ?? ""} phone={me?.phone ?? ""} city={me?.city ?? ""} lang={await getLang()} />
      </div>
    </AppShell>
  );
}
