import { asc, count, desc, eq, or, type SQL, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { bookings, clients } from "../db/schema";

export const CLIENTS_PAGE_SIZE = 20;

type Inserter = Pick<Database, "insert">;

// The phone identifies the client; a new booking refreshes her name.
export async function upsertClient(db: Inserter, client: { phone: string; name: string }) {
  const now = new Date();
  const [saved] = await db
    .insert(clients)
    .values({ ...client, updatedAt: now })
    .onConflictDoUpdate({ target: clients.phone, set: { name: client.name, updatedAt: now } })
    .returning({ id: clients.id });
  return saved!;
}

const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

function searchFilter(search: string | undefined): SQL | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  const byName = sql`${clients.name} like ${`%${escapeLike(term)}%`} escape '\\'`;
  const digits = term.replace(/\D/g, "");
  return digits ? or(byName, sql`${clients.phone} like ${`%${digits}%`}`) : byName;
}

export async function queryClients(
  db: Database,
  { search, offset = 0, now = new Date() }: { search?: string; offset?: number; now?: Date },
) {
  const nowMs = now.getTime();
  const isVisit = sql`${bookings.status} = 'confirmed' and ${bookings.endsAt} <= ${nowMs}`;
  const isUpcoming = sql`${bookings.status} = 'confirmed' and ${bookings.startsAt} > ${nowMs}`;
  const nextVisitAt = sql<
    number | null
  >`min(case when ${isUpcoming} then ${bookings.startsAt} end)`;
  const lastActivity = sql`coalesce(max(${bookings.createdAt}), ${clients.createdAt})`;
  const where = searchFilter(search);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      visits: sql<number>`coalesce(sum(case when ${isVisit} then 1 else 0 end), 0)`,
      spentCents: sql<number>`coalesce(sum(case when ${isVisit} then ${bookings.servicePriceCents} else 0 end), 0)`,
      lastVisitAt: sql<number | null>`max(case when ${isVisit} then ${bookings.startsAt} end)`,
      nextVisitAt,
      cancellations: sql<number>`coalesce(sum(case when ${bookings.status} = 'cancelled' then 1 else 0 end), 0)`,
    })
    .from(clients)
    .leftJoin(bookings, eq(bookings.clientId, clients.id))
    .where(where)
    .groupBy(clients.id)
    // Clients with an upcoming booking first (soonest first), then the most recently active.
    .orderBy(sql`${nextVisitAt} is null`, asc(nextVisitAt), desc(lastActivity), asc(clients.id))
    .limit(CLIENTS_PAGE_SIZE + 1)
    .offset(offset);

  const [counted] = await db.select({ total: count() }).from(clients).where(where);
  return {
    total: counted?.total ?? 0,
    items: rows.slice(0, CLIENTS_PAGE_SIZE),
    hasMore: rows.length > CLIENTS_PAGE_SIZE,
  };
}

export async function listClients(params: { search?: string; offset?: number }) {
  const db = await useDb();
  const [page, timezone] = await Promise.all([queryClients(db, params), storeTimezone()]);
  return { ...page, timezone };
}
