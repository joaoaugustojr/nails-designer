import { eq } from "drizzle-orm";

import type { StoreImageKind, StoreInput } from "#shared/schemas/store";

import { settings } from "../db/schema";

const IMAGE_COLUMNS = { logo: "logoPath", cover: "coverPath" } as const;

const emptyToNull = (value: string) => value || null;

export async function getStoreSettings() {
  const db = await useDb();
  const store = await db.query.settings.findFirst({
    columns: {
      storeName: true,
      accentColor: true,
      logoPath: true,
      coverPath: true,
      address: true,
      whatsapp: true,
      instagram: true,
      about: true,
      thankYouMessage: true,
    },
  });
  return store!;
}

export async function updateStoreSettings(input: StoreInput) {
  const db = await useDb();
  await db
    .update(settings)
    .set({
      storeName: input.storeName,
      accentColor: input.accentColor,
      address: emptyToNull(input.address),
      whatsapp: emptyToNull(input.whatsapp),
      instagram: emptyToNull(input.instagram),
      about: emptyToNull(input.about),
      thankYouMessage: emptyToNull(input.thankYouMessage),
    })
    .where(eq(settings.id, 1));
}

export async function replaceStoreImage(kind: StoreImageKind, data: Uint8Array) {
  const extension = assertImage(data);
  const column = IMAGE_COLUMNS[kind];
  const previous = (await getStoreSettings())[column];

  const path = await saveImage(data, extension);
  const db = await useDb();
  await db
    .update(settings)
    .set({ [column]: path })
    .where(eq(settings.id, 1));

  if (previous) await deleteUpload(previous);
  return { path };
}
