import { DEFAULT_ACCENT, storeSchema } from "#shared/schemas/store";

type FieldName =
  "storeName" | "address" | "mapLocation" | "whatsapp" | "instagram" | "about" | "thankYouMessage";

const FIELD_ERRORS: Record<FieldName, string> = {
  storeName: "Informe o nome do estúdio (até 80 caracteres).",
  address: "O endereço pode ter até 200 caracteres.",
  mapLocation: "Cole os números do Google Maps, por exemplo -18.147734, -47.912953.",
  whatsapp: "Informe o WhatsApp com DDD, por exemplo (11) 91234-5678.",
  instagram: "Informe só o usuário, por exemplo @alineprata.",
  about: "O texto pode ter até 500 caracteres.",
  thankYouMessage: "A mensagem pode ter até 300 caracteres.",
};

export function useStoreSettings() {
  const { isOwner: canEdit } = usePanelUser();

  const { data: store, refresh } = useFetch("/api/admin/store");

  const form = reactive({
    storeName: "",
    accentColor: DEFAULT_ACCENT.light as string,
    address: "",
    mapLocation: "",
    whatsapp: "",
    instagram: "",
    about: "",
    thankYouMessage: "",
  });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isSaving = ref(false);
  const uploading = ref<"logo" | "cover" | null>(null);
  const { confirmAction } = useConfirmDialog();

  watch(
    store,
    (loaded) => {
      if (!loaded) return;
      Object.assign(form, {
        storeName: loaded.storeName,
        accentColor: loaded.accentColor,
        address: loaded.address ?? "",
        mapLocation: loaded.mapLocation?.replace(",", ", ") ?? "",
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
    errors.value = result.success ? {} : fieldMessages(result.error, FIELD_ERRORS);
    return result.success ? result.data : null;
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

  async function uploadImage(target: "logo" | "cover", file: File) {
    const url = target === "logo" ? "/api/admin/store/logo" : "/api/admin/store/covers";
    error.value = "";
    uploading.value = target;
    try {
      const body = new FormData();
      body.append("image", await shrinkImage(file), file.name);
      await $fetch(url, { method: "POST", body });
      await reload();
    } catch {
      error.value = `Use uma imagem JPG, PNG ou WebP de até ${MAX_IMAGE_MEGABYTES} MB.`;
    } finally {
      uploading.value = null;
    }
  }

  const uploadLogo = (file: File) => uploadImage("logo", file);
  const addCover = (file: File) => uploadImage("cover", file);

  async function removeCover(index: number) {
    const isRemoved = await confirmAction({
      title: "Remover esta capa?",
      description: "Ela deixa de aparecer no topo do site.",
      confirmLabel: "Remover",
      pendingLabel: "Removendo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/store/covers/${index}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await reload();
  }

  async function reorderCovers(paths: string[]) {
    error.value = "";
    try {
      await $fetch("/api/admin/store/covers", { method: "PUT", body: { paths } });
    } catch {
      error.value = "Não foi possível salvar a nova ordem. Tente novamente.";
    }
    await reload();
  }

  return {
    canEdit,
    store,
    form,
    errors,
    error,
    isSaving,
    uploading,
    save,
    uploadLogo,
    addCover,
    removeCover,
    reorderCovers,
  };
}
