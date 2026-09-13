import { redirect } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getOrCreateReferralCode } from "@/lib/referral";
import { getViewer, hasInvite } from "@/lib/viewer";
import { ShareCode } from "./share";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite a friend" };

/**
 * One route, two screens. Gold members get the invite page; everyone else is
 * sent to the gold page. The viewer state decides, never the URL.
 */
export default async function InvitePage() {
  const viewer = await getViewer();
  if (!hasInvite(viewer)) redirect("/gold");

  const { code, joined } = await withTenant(viewer.tenantId, async (db) => {
    const created = await getOrCreateReferralCode(db, viewer.tenantId, viewer.userId!);
    const rows = await db.find<UserDoc>("users", { referredByCode: created }, { limit: 20 });
    return { code: created, joined: rows.map((u) => ({ name: u.name, city: u.city, rewardedAt: u.referralRewardedAt })) };
  });

  return (
    <AppShell
      viewer={viewer}
      tab="invite"
      header={<GradHeader title="Invite a friend" subtitle="When a friend joins with your code, you both get an extra month." tall />}
    >
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <ShareCode code={code} />

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[1.05rem] font-bold">Friends who joined</h2>
            <span className="ml-auto text-[0.85rem] font-medium tabular-nums text-ink-3">{joined.length}</span>
          </div>

          {joined.length === 0 ? (
            <Card className="px-5 py-8 text-center">
              <p className="text-[0.92rem] text-ink-3">Nobody yet. Use the button above to send your code.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {joined.map((p, i) => (
                <Card key={i} className="flex items-center gap-3 p-3">
                  <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-pill bg-wash text-[0.95rem] font-semibold text-violet">
                    {(p.name ?? "?").trim().charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] font-semibold">{p.name}</span>
                    {p.city ? <span className="block text-[0.78rem] text-ink-3">{p.city}</span> : null}
                  </span>
                  <span
                    className={
                      p.rewardedAt
                        ? "flex-none rounded-pill bg-fill px-3 py-1 text-[0.72rem] font-semibold text-on-fill"
                        : "flex-none rounded-pill bg-wash px-3 py-1 text-[0.72rem] font-semibold text-ink-3"
                    }
                  >
                    {p.rewardedAt ? "+1 month" : "Not gold yet"}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
