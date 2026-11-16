import { newUserSchema, PASSWORD_MIN_LENGTH, passwordResetSchema } from "#shared/schemas/user";

type FieldName = "name" | "email" | "password";

const FIELD_ERRORS: Record<FieldName, string> = {
  name: "Informe o nome.",
  email: "Informe um email válido.",
  password: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
};

export function usePanelUsers() {
  const { isOwner: canManage } = usePanelUser();

  const { data: users, refresh } = useFetch("/api/admin/users", { default: () => [] });
  const { confirmAction } = useConfirmDialog();

  const form = reactive({ name: "", email: "", password: "" });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isAdding = ref(false);
  const isSaving = ref(false);

  function openForm() {
    Object.assign(form, { name: "", email: "", password: "" });
    errors.value = {};
    error.value = "";
    isAdding.value = true;
  }

  async function addUser() {
    const parsed = newUserSchema.safeParse(form);
    errors.value = parsed.success ? {} : fieldMessages(parsed.error, FIELD_ERRORS);
    if (!parsed.success) return;

    error.value = "";
    isSaving.value = true;
    try {
      await $fetch("/api/admin/users", { method: "POST", body: parsed.data });
      isAdding.value = false;
      await refresh();
    } catch (failure) {
      error.value =
        errorStatus(failure) === 409
          ? "Este email já tem acesso ao painel."
          : "Não foi possível cadastrar.";
    } finally {
      isSaving.value = false;
    }
  }

  async function removeUser(id: number, name: string) {
    const isRemoved = await confirmAction({
      title: `Remover ${name}?`,
      description: "O acesso ao painel termina na hora.",
      confirmLabel: "Remover",
      pendingLabel: "Removendo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await refresh();
  }

  const resettingId = ref<number | null>(null);
  const newPassword = ref("");
  const resetError = ref("");

  function startReset(id: number) {
    resettingId.value = id;
    newPassword.value = "";
    resetError.value = "";
  }

  function cancelReset() {
    resettingId.value = null;
  }

  async function saveReset(name: string) {
    const parsed = passwordResetSchema.safeParse({ password: newPassword.value });
    if (!parsed.success) {
      resetError.value = FIELD_ERRORS.password;
      return;
    }
    const id = resettingId.value;
    const isChanged = await confirmAction({
      title: `Trocar a senha de ${name}?`,
      description: "Quem estiver conectado com esta conta sai do painel.",
      confirmLabel: "Trocar senha",
      pendingLabel: "Trocando…",
      action: async () => {
        await $fetch(`/api/admin/users/${id}/password`, { method: "PUT", body: parsed.data });
      },
    });
    if (isChanged) resettingId.value = null;
  }

  return {
    canManage,
    users,
    form,
    errors,
    error,
    isAdding,
    isSaving,
    openForm,
    addUser,
    removeUser,
    resettingId,
    newPassword,
    resetError,
    startReset,
    cancelReset,
    saveReset,
  };
}
