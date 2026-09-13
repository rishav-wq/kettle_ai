import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell, GradHeader } from "@/components/app-shell";
import { withTenant } from "@/lib/db/tenant";
import { users } from "@/lib/db/schema";
import { getViewer } from "@/lib/viewer";
import { AccountForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle · Account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/signin?next=/account");

  const [me] = await withTenant(viewer.tenantId, (tx) =>
    tx
      .select({ name: users.name, phone: users.phone, city: users.city, whatsappOptIn: users.whatsappOptIn })
      .from(users)
      .where(eq(users.id, viewer.userId!))
      .limit(1)
  );

  return (
    <AppShell viewer={viewer} tab="account" header={<GradHeader title="Account" back={{ href: "/mine", label: "My classes" }} />}>
      {/* A form has a natural measure: a name field a thousand pixels wide is
          harder to use, not easier. */}
      <div className="pt-6 lg:max-w-[640px]"><AccountForm
        name={me?.name ?? ""}
        phone={me?.phone ?? ""}
        city={me?.city ?? ""}
        whatsappOptIn={me?.whatsappOptIn ?? false}
      /></div>
    </AppShell>
  );
}
