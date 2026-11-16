import { serviceSchema } from "#shared/schemas/service";

import type { ApiGet } from "~/types/api";

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

  const { data: service, refresh } = useFetch<ApiGet<"/api/admin/services/:id">>(
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
  const pendingPhotos = ref<File[]>([]);
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
    if (!pendingPhotos.value.length) return;
    const body = new FormData();
    pendingPhotos.value.forEach((file) => body.append("photos", file));
    await $fetch(`/api/admin/services/${id}/photos`, { method: "POST", body });
  }

  async function save() {
    const input = validate();
    if (!input) return;

    formError.value = "";
    isSaving.value = true;
    try {
      const { id } = isNew
        ? await $fetch("/api/admin/services", { method: "POST", body: input })
        : await $fetch(`/api/admin/services/${serviceId}`, { method: "PATCH", body: input });
      await uploadPendingPhotos(id);
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
    if (isRemoved) await refresh();
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
    photos: computed(() => service.value?.photos ?? []),
    pendingPhotos,
    errors,
    formError,
    isSaving,
    save,
    removePhoto,
    removeService,
  };
}
