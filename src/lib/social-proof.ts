import "server-only";
import { and, desc, eq, gt, isNotNull } from "drizzle-orm";
import { memberships, users } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";

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

export async function recentJoiners(tx: Tx, limit = 8): Promise<Joiner[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5);

  const rows = await tx
    .select({ name: users.name, city: users.city, at: memberships.createdAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.status, "active"), gt(memberships.createdAt, since), isNotNull(users.name)))
    .orderBy(desc(memberships.createdAt))
    .limit(limit);

  const now = Date.now();
  return rows
    .map((r) => ({
      firstName: (r.name ?? "").trim().split(/\s+/)[0] ?? "",
      city: r.city,
      daysAgo: Math.max(0, Math.floor((now - r.at.getTime()) / 864e5)),
    }))
    .filter((r) => r.firstName.length > 0);
}
