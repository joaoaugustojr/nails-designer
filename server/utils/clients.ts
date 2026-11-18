import { and, asc, count, desc, eq, gt, or, type SQL, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { bookings, clients } from "../db/schema";

export const CLIENTS_PAGE_SIZE = 20;

export const REMOVED_CLIENT_NAME = "Cliente removida";

// Not awaited here, so it can run on its own or inside a batch.
export function upsertClient(db: Database, client: { phone: string; name: string }) {
  const now = new Date();
  return db
    .insert(clients)
    .values({ ...client, updatedAt: now })
    .onConflictDoUpdate({ target: clients.phone, set: { name: client.name, updatedAt: now } });
}

const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

function searchFilter(search: string | undefined): SQL | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  const byName = sql`${clients.name} like ${`%${escapeLike(term)}%`} escape '\\'`;
  const digits = term.replace(/\D/g, "");
  return digits ? or(byName, sql`${clients.phone} like ${`%${digits}%`}`) : byName;
}

export async function listClients({
  search,
  offset = 0,
  now = new Date(),
}: {
  search?: string;
  offset?: number;
  now?: Date;
}) {
  const db = await useDb();
  const nowMs = now.getTime();
  const isVisit = sql`${bookings.status} = 'confirmed' and ${bookings.endsAt} <= ${nowMs}`;
  const isUpcoming = sql`${bookings.status} = 'confirmed' and ${bookings.startsAt} > ${nowMs}`;
  const nextVisitAt = sql<
    number | null
  >`min(case when ${isUpcoming} then ${bookings.startsAt} end)`;
  const nextBookingId = sql<number | null>`(
    select upcoming.id from bookings upcoming
    where upcoming.client_id = ${clients.id} and upcoming.status = 'confirmed'
      and upcoming.starts_at > ${nowMs}
    order by upcoming.starts_at limit 1
  )`;
  const nextServiceName = sql<string | null>`(
    select upcoming.service_name from bookings upcoming
    where upcoming.client_id = ${clients.id} and upcoming.status = 'confirmed'
      and upcoming.starts_at > ${nowMs}
    order by upcoming.starts_at limit 1
  )`;
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
      nextBookingId,
      nextServiceName,
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

// Her personal data is erased (LGPD) but her bookings stay, so the store's history adds up.
// A client with an upcoming booking is refused: that booking is cancelled first.
export async function removeClient(id: number, now = new Date()) {
  const db = await useDb();
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    columns: { id: true },
  });
  if (!client) throw createError({ statusCode: 404, statusMessage: "Client not found" });

  const upcoming = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.clientId, id),
      eq(bookings.status, "confirmed"),
      gt(bookings.startsAt, now),
    ),
    columns: { id: true },
  });
  if (upcoming)
    throw createError({ statusCode: 409, statusMessage: "Client has an upcoming booking" });

  await db.batch([
    db
      .update(bookings)
      .set({ clientName: REMOVED_CLIENT_NAME, clientPhone: "" })
      .where(eq(bookings.clientId, id)),
    db.delete(clients).where(eq(clients.id, id)),
  ]);
}
