import { serviceSchema } from "#shared/schemas/service";

import type { ApiGet } from "~/types/api";

type Photo = ApiGet<"/api/admin/services/:id">["photos"][number];

export type PhotoTile = { key: string; src: string } & ({ photoId: number } | { file: File });

const savedTile = (photo: Photo): PhotoTile => ({
  key: `photo-${photo.id}`,
  src: photo.path,
  photoId: photo.id,
});

type FieldName = "name" | "details" | "includes" | "priceCents" | "durationMinutes";

const DEFAULT_DURATION_MINUTES = 60;

const FIELD_ERRORS: Record<FieldName, string> = {
  name: "Informe o nome do serviço (até 80 caracteres).",
  details: "Os detalhes podem ter até 2000 caracteres.",
  includes: "A lista pode ter até 2000 caracteres.",
  priceCents: "Informe um preço válido, por exemplo 45,00.",
  durationMinutes: "Escolha uma duração.",
};

const INPUT_FIELDS = {
  name: "name",
  details: "details",
  includes: "includes",
  price: "priceCents",
  durationMinutes: "durationMinutes",
} as const satisfies Record<string, FieldName>;

export function useServiceForm(serviceId: string) {
  const isNew = serviceId === "new";
  const listPath = "/admin/services";

  const { data: service } = useFetch<ApiGet<"/api/admin/services/:id">>(
    `/api/admin/services/${serviceId}`,
    { immediate: !isNew },
  );

  const form = reactive({
    name: "",
    details: "",
    includes: "",
    price: "",
    durationMinutes: DEFAULT_DURATION_MINUTES,
    active: true,
  });
  const photoTiles = ref<PhotoTile[]>([]);
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const formError = ref("");
  const isSaving = ref(false);
  const { confirmAction } = useConfirmDialog();

  watch(
    service,
    (loaded) => {
      if (!loaded) return;
      Object.assign(form, {
        name: loaded.name,
        details: loaded.details,
        includes: loaded.includes,
        price: centsToPriceInput(loaded.priceCents),
        durationMinutes: loaded.durationMinutes,
        active: loaded.active,
      });
      const pendingTiles = photoTiles.value.filter((tile) => "file" in tile);
      photoTiles.value = [...loaded.photos.map(savedTile), ...pendingTiles];
    },
    { immediate: true },
  );

  for (const [input, field] of Object.entries(INPUT_FIELDS)) {
    watch(
      () => form[input as keyof typeof INPUT_FIELDS],
      () => (errors.value[field] = undefined),
    );
  }

  function validate() {
    const result = serviceSchema.safeParse({
      name: form.name,
      details: form.details,
      includes: form.includes,
      priceCents: parsePrice(form.price) ?? Number.NaN,
      durationMinutes: Number(form.durationMinutes),
      active: form.active,
    });
    errors.value = result.success ? {} : fieldMessages(result.error, FIELD_ERRORS);
    return result.success ? result.data : null;
  }

  async function uploadPendingPhotos(id: number) {
    const files = photoTiles.value.flatMap((tile) => ("file" in tile ? [tile.file] : []));
    if (!files.length) return [];
    const body = new FormData();
    const photos = await Promise.all(files.map(shrinkImage));
    photos.forEach((photo, index) => body.append("photos", photo, files[index]!.name));
    const { ids } = await $fetch(`/api/admin/services/${id}/photos`, { method: "POST", body });
    return ids;
  }

  async function savePhotos(id: number) {
    const uploadedIds = (await uploadPendingPhotos(id)).values();
    const ids = photoTiles.value.map((tile) =>
      "photoId" in tile ? tile.photoId : uploadedIds.next().value!,
    );
    if (!ids.length) return;
    await $fetch(`/api/admin/services/${id}/photos/order`, { method: "PUT", body: { ids } });
  }

  async function save() {
    const input = validate();
    if (!input) return;

    formError.value = "";
    isSaving.value = true;
    try {
      const { id } = isNew
        ? await $fetch("/api/admin/services", { method: "POST", body: input })
        : await $fetch<{ id: number }>(`/api/admin/services/${serviceId}`, {
            method: "PATCH",
            body: input,
          });
      await savePhotos(id);
      await navigateTo(listPath);
    } catch {
      formError.value = "Não foi possível salvar. Confira as fotos e tente novamente.";
    } finally {
      isSaving.value = false;
    }
  }

  async function removePhoto(photoId: number) {
    const isRemoved = await confirmAction({
      title: "Remover esta foto?",
      confirmLabel: "Remover",
      pendingLabel: "Removendo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/services/${serviceId}/photos/${photoId}`, { method: "DELETE" });
      },
    });
    if (isRemoved) {
      photoTiles.value = photoTiles.value.filter(
        (tile) => !("photoId" in tile) || tile.photoId !== photoId,
      );
    }
  }

  async function removeService() {
    const isRemoved = await confirmAction({
      title: `Excluir ${form.name || "este serviço"}?`,
      description: "Os agendamentos já feitos continuam na agenda.",
      confirmLabel: "Excluir",
      pendingLabel: "Excluindo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/services/${serviceId}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await navigateTo(listPath);
  }

  return {
    isNew,
    listPath,
    form,
    photoTiles,
    errors,
    formError,
    isSaving,
    save,
    removePhoto,
    removeService,
  };
}
