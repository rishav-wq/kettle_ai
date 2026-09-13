import "server-only";
import type { MembershipDoc, UserDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  Recent joiners.

  Read from real memberships. Never fabricated, never padded, and empty is a
  perfectly acceptable answer. This audience is targeted by fraud and the first
  thing we teach them is how to spot it; inventing a signup would make the
  product an example of the thing it warns about.

  Only a first name and a city leave the server. No phone, no full name, no id.
*/

/** daysAgo is computed here, in plain code, so no component needs a clock. */
export type Joiner = { firstName: string; city: string | null; daysAgo: number };

const WINDOW_DAYS = 14;

export async function recentJoiners(db: Scoped, limit = 8): Promise<Joiner[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5);

  const memberships = await db.find<MembershipDoc>(
    "memberships",
    { status: "active", createdAt: { $gt: since } },
    { sort: { createdAt: -1 }, limit }
  );
  if (memberships.length === 0) return [];

  /*
    Two queries and a join in memory, where Postgres did one INNER JOIN. At
    eight rows that is cheaper than an aggregation pipeline and far easier to
    read. It also keeps the tenant scoping honest: both halves go through the
    scoped handle, so neither can quietly read another tenant's people.
  */
  const users = await db.find<UserDoc>("users", { id: { $in: memberships.map((m) => m.userId) } });
  const byId = new Map(users.map((u) => [u.id, u]));

  const now = Date.now();
  return memberships
    .map((m) => {
      const user = byId.get(m.userId);
      return {
        firstName: (user?.name ?? "").trim().split(/\s+/)[0] ?? "",
        city: user?.city ?? null,
        daysAgo: Math.max(0, Math.floor((now - m.createdAt.getTime()) / 864e5)),
      };
    })
    .filter((r) => r.firstName.length > 0);
}
