import { DEFAULT_ACCENT, type StoreImageKind, storeSchema } from "#shared/schemas/store";

type FieldName = "storeName" | "address" | "whatsapp" | "instagram" | "about" | "thankYouMessage";

const FIELD_ERRORS: Record<FieldName, string> = {
  storeName: "Informe o nome do estúdio (até 80 caracteres).",
  address: "O endereço pode ter até 200 caracteres.",
  whatsapp: "Informe o WhatsApp com DDD, por exemplo (11) 91234-5678.",
  instagram: "Informe só o usuário, por exemplo @alineprata.",
  about: "O texto pode ter até 500 caracteres.",
  thankYouMessage: "A mensagem pode ter até 300 caracteres.",
};

export function useStoreSettings() {
  const { user } = useUserSession();
  const canEdit = computed(() => user.value?.role === "owner");

  const { data: store, refresh } = useFetch("/api/admin/store");

  const form = reactive({
    storeName: "",
    accentColor: DEFAULT_ACCENT.light as string,
    address: "",
    whatsapp: "",
    instagram: "",
    about: "",
    thankYouMessage: "",
  });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isSaving = ref(false);

  watch(
    store,
    (loaded) => {
      if (!loaded) return;
      Object.assign(form, {
        storeName: loaded.storeName,
        accentColor: loaded.accentColor,
        address: loaded.address ?? "",
        whatsapp: loaded.whatsapp ? formatPhone(loaded.whatsapp) : "",
        instagram: loaded.instagram ? `@${loaded.instagram}` : "",
        about: loaded.about ?? "",
        thankYouMessage: loaded.thankYouMessage ?? "",
      });
    },
    { immediate: true },
  );

  function validate() {
    const result = storeSchema.safeParse(form);
    errors.value = {};
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      const field = issue.path[0] as FieldName;
      errors.value[field] = FIELD_ERRORS[field];
    }
    return null;
  }

  async function reload() {
    await Promise.all([refresh(), refreshStoreInfo()]);
  }

  async function save() {
    const input = validate();
    if (!input) return;
    error.value = "";
    isSaving.value = true;
    try {
      await $fetch("/api/admin/store", { method: "PUT", body: input });
      await reload();
    } catch {
      error.value = "Não foi possível salvar. Tente novamente.";
    } finally {
      isSaving.value = false;
    }
  }

  async function uploadImage(kind: StoreImageKind, file: File) {
    const body = new FormData();
    body.append("image", file);
    error.value = "";
    try {
      await $fetch(`/api/admin/store/${kind}`, { method: "POST", body });
      await reload();
    } catch {
      error.value = "Use uma imagem JPG, PNG ou WebP de até 8 MB.";
    }
  }

  return { canEdit, store, form, errors, error, isSaving, save, uploadImage };
}
