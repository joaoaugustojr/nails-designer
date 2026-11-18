import { and, asc, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { SERVICE_MAX_PHOTOS, type ServiceInput } from "#shared/schemas/service";

import { servicePhotos, services } from "../db/schema";

const servicesInOrder = [asc(services.sortOrder), asc(services.id)];
const photosInOrder = [asc(servicePhotos.sortOrder), asc(servicePhotos.id)];

const nextOrder = (lastOrder: number | null | undefined) => (lastOrder ?? -1) + 1;

const notFound = () => createError({ statusCode: 404, statusMessage: "Service not found" });

export async function listServices() {
  const db = await useDb();
  return db.query.services.findMany({
    orderBy: servicesInOrder,
    with: { photos: { columns: { id: true, path: true }, orderBy: photosInOrder, limit: 1 } },
  });
}

export async function listCatalog() {
  const db = await useDb();
  const active = await db.query.services.findMany({
    where: eq(services.active, true),
    columns: {
      id: true,
      name: true,
      details: true,
      includes: true,
      priceCents: true,
      durationMinutes: true,
    },
    orderBy: servicesInOrder,
    with: { photos: { columns: { id: true, path: true }, orderBy: photosInOrder } },
  });
  return active.map((service) => ({
    ...service,
    includes: service.includes
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  }));
}

export async function findService(id: number) {
  const db = await useDb();
  const service = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: { photos: { columns: { id: true, path: true }, orderBy: photosInOrder } },
  });
  if (!service) throw notFound();
  return service;
}

export async function createService(input: ServiceInput) {
  const db = await useDb();
  const [last] = await db.select({ order: max(services.sortOrder) }).from(services);
  const [created] = await db
    .insert(services)
    .values({ ...input, sortOrder: nextOrder(last?.order) })
    .returning({ id: services.id });
  return created!;
}

export async function updateService(id: number, changes: Partial<ServiceInput>) {
  const db = await useDb();
  const [updated] = await db
    .update(services)
    .set(changes)
    .where(eq(services.id, id))
    .returning({ id: services.id });
  if (!updated) throw notFound();
  return updated;
}

export async function deleteService(id: number) {
  const service = await findService(id);
  const db = await useDb();
  await db.delete(services).where(eq(services.id, id));
  await Promise.all(service.photos.map((photo) => deleteUpload(photo.path)));
}

export async function addServicePhotos(id: number, images: Uint8Array[]) {
  const service = await findService(id);
  if (service.photos.length + images.length > SERVICE_MAX_PHOTOS) {
    throw createError({ statusCode: 400, statusMessage: "Too many photos" });
  }

  // Prepare every image before writing any, so a bad file leaves nothing behind.
  const prepared = await Promise.all(images.map(prepareImage));
  const paths = await Promise.all(prepared.map(saveImage));

  const db = await useDb();
  const [last] = await db
    .select({ order: max(servicePhotos.sortOrder) })
    .from(servicePhotos)
    .where(eq(servicePhotos.serviceId, id));
  const inserted = await db
    .insert(servicePhotos)
    .values(
      paths.map((path, index) => ({
        serviceId: id,
        path,
        sortOrder: nextOrder(last?.order) + index,
      })),
    )
    .returning({ id: servicePhotos.id });
  return inserted.map((photo) => photo.id);
}

export async function deleteServicePhoto(serviceId: number, photoId: number) {
  const db = await useDb();
  const [deleted] = await db
    .delete(servicePhotos)
    .where(and(eq(servicePhotos.id, photoId), eq(servicePhotos.serviceId, serviceId)))
    .returning({ path: servicePhotos.path });
  if (!deleted) throw createError({ statusCode: 404, statusMessage: "Photo not found" });
  await deleteUpload(deleted.path);
}

async function runInBatch(updates: BatchItem<"sqlite">[]) {
  const [first, ...rest] = updates;
  if (!first) return;
  const db = await useDb();
  await db.batch([first, ...rest]);
}

export async function reorderServices(ids: number[]) {
  const db = await useDb();
  await runInBatch(
    ids.map((id, index) =>
      db.update(services).set({ sortOrder: index }).where(eq(services.id, id)),
    ),
  );
}

export async function reorderServicePhotos(serviceId: number, ids: number[]) {
  const db = await useDb();
  await runInBatch(
    ids.map((id, index) =>
      db
        .update(servicePhotos)
        .set({ sortOrder: index })
        .where(and(eq(servicePhotos.id, id), eq(servicePhotos.serviceId, serviceId))),
    ),
  );
}
