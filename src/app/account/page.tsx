import { redirect } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getViewer } from "@/lib/viewer";
import { getLang } from "@/lib/lang";
import { isAdminPhone } from "@/lib/admin";
import Link from "next/link";
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
      <div className="flex flex-col gap-6 lg:max-w-[640px]">
        {/*
          The only link to the editor anywhere in the product, and it is here
          because this page has already read the user document — so deciding
          whether to show it costs nothing, where putting it in the app frame
          would mean an extra read on every screen for a link one person uses.
          /admin is reachable by address regardless; this is a convenience, not
          the access control.
        */}
        {isAdminPhone(me?.phone) ? (
          <Link
            href="/admin"
            className="flex min-h-[52px] items-center gap-3 rounded-tile border border-line bg-paper px-4 text-[0.95rem] font-semibold"
          >
            Catalogue editor
            <span aria-hidden className="ml-auto text-ink-3">
              ›
            </span>
          </Link>
        ) : null}

        <AccountForm name={me?.name ?? ""} phone={me?.phone ?? ""} city={me?.city ?? ""} lang={await getLang()} />
      </div>
    </AppShell>
  );
}
