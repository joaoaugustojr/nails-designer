import type { StoreImageKind, StoreInput } from "#shared/schemas/store";

const IMAGE_COLUMNS = { logo: "logoPath", cover: "coverPath" } as const;

const emptyToNull = (value: string) => value || null;

// Fields are listed one by one so a new settings column never becomes public by accident.
export async function getPublicStore() {
  const store = await readSettings();
  return {
    name: store.storeName,
    logoPath: store.logoPath,
    accentColor: store.accentColor,
    timezone: store.timezone,
  };
}

export async function getStoreSettings() {
  const store = await readSettings();
  return {
    storeName: store.storeName,
    accentColor: store.accentColor,
    logoPath: store.logoPath,
    coverPath: store.coverPath,
    address: store.address,
    whatsapp: store.whatsapp,
    instagram: store.instagram,
    about: store.about,
    thankYouMessage: store.thankYouMessage,
  };
}

export async function updateStoreSettings(input: StoreInput) {
  await writeSettings({
    storeName: input.storeName,
    accentColor: input.accentColor,
    address: emptyToNull(input.address),
    whatsapp: emptyToNull(input.whatsapp),
    instagram: emptyToNull(input.instagram),
    about: emptyToNull(input.about),
    thankYouMessage: emptyToNull(input.thankYouMessage),
  });
}

export async function replaceStoreImage(kind: StoreImageKind, data: Uint8Array) {
  const extension = assertImage(data);
  const column = IMAGE_COLUMNS[kind];
  const previous = (await readSettings())[column];

  const path = await saveImage(data, extension);
  await writeSettings({ [column]: path });

  if (previous) await deleteUpload(previous);
  return { path };
}
