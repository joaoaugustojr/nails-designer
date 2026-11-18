import { STORE_MAX_COVERS, type StoreInput } from "#shared/schemas/store";

const emptyToNull = (value: string) => value || null;

// Fields are listed one by one so a new settings column never becomes public by accident.
export async function getPublicStore() {
  const store = await readSettings();
  return {
    name: store.storeName,
    logoPath: store.logoPath,
    coverPaths: store.coverPaths,
    about: store.about,
    accentColor: store.accentColor,
    timezone: store.timezone,
    isWaitlistEnabled: store.isWaitlistEnabled,
  };
}

export async function getStoreProfile() {
  const store = await readSettings();
  return {
    name: store.storeName,
    logoPath: store.logoPath,
    coverPaths: store.coverPaths,
    about: store.about,
    address: store.address,
    mapLocation: store.mapLocation,
    whatsapp: store.whatsapp,
    instagram: store.instagram,
    thankYouMessage: store.thankYouMessage,
    timezone: store.timezone,
  };
}

export async function getStoreSettings() {
  const store = await readSettings();
  return {
    storeName: store.storeName,
    accentColor: store.accentColor,
    logoPath: store.logoPath,
    coverPaths: store.coverPaths,
    address: store.address,
    mapLocation: store.mapLocation,
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
    mapLocation: emptyToNull(input.mapLocation),
    whatsapp: emptyToNull(input.whatsapp),
    instagram: emptyToNull(input.instagram),
    about: emptyToNull(input.about),
    thankYouMessage: emptyToNull(input.thankYouMessage),
  });
}

export async function replaceStoreLogo(data: Uint8Array) {
  const image = await prepareImage(data);
  const previous = (await readSettings()).logoPath;

  const path = await saveImage(image);
  await writeSettings({ logoPath: path });

  if (previous) await deleteUpload(previous);
  return { path };
}

export async function addStoreCover(data: Uint8Array) {
  const image = await prepareImage(data);
  const { coverPaths } = await readSettings();
  if (coverPaths.length >= STORE_MAX_COVERS) {
    throw createError({ statusCode: 400, statusMessage: "Too many covers" });
  }

  const path = await saveImage(image);
  await writeSettings({ coverPaths: [...coverPaths, path] });
  return { path };
}

export async function deleteStoreCover(index: number) {
  const { coverPaths } = await readSettings();
  const path = coverPaths[index];
  if (!path) throw createError({ statusCode: 404, statusMessage: "Cover not found" });

  await writeSettings({ coverPaths: coverPaths.filter((_, position) => position !== index) });
  await deleteUpload(path);
}

export async function reorderStoreCovers(paths: string[]) {
  const { coverPaths } = await readSettings();
  const isSameSet =
    paths.length === coverPaths.length && coverPaths.every((path) => paths.includes(path));
  if (!isSameSet) throw createError({ statusCode: 400, statusMessage: "Covers changed" });
  await writeSettings({ coverPaths: paths });
}
