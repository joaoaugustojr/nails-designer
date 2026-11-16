import { PASSWORD_MIN_LENGTH, passwordChangeSchema, profileSchema } from "#shared/schemas/user";

export function useAccount() {
  const { user, fetch: refreshSession } = useUserSession();

  const name = ref(user.value?.name ?? "");
  const nameError = ref("");
  const isSavingName = ref(false);
  const hasNameChanged = computed(() => name.value.trim() !== user.value?.name);

  const isChangingPassword = ref(false);
  const passwords = reactive({ current: "", next: "", confirmation: "" });
  const passwordError = ref("");
  const isSavingPassword = ref(false);

  async function saveName() {
    const parsed = profileSchema.safeParse({ name: name.value });
    if (!parsed.success) {
      nameError.value = "Informe o seu nome (até 80 caracteres).";
      return;
    }
    nameError.value = "";
    isSavingName.value = true;
    try {
      await $fetch("/api/admin/me", { method: "PATCH", body: parsed.data });
      await refreshSession();
      await refreshNuxtData();
    } catch {
      nameError.value = "Não foi possível salvar o nome.";
    } finally {
      isSavingName.value = false;
    }
  }

  function openPasswordForm() {
    Object.assign(passwords, { current: "", next: "", confirmation: "" });
    passwordError.value = "";
    isChangingPassword.value = true;
  }

  function validatePasswords() {
    if (passwords.next.length < PASSWORD_MIN_LENGTH) {
      return `A nova senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }
    if (passwords.next !== passwords.confirmation)
      return "A confirmação não confere com a nova senha.";
    return "";
  }

  async function savePassword() {
    passwordError.value = validatePasswords();
    if (passwordError.value) return;

    const body = passwordChangeSchema.parse({
      currentPassword: passwords.current,
      newPassword: passwords.next,
    });
    isSavingPassword.value = true;
    try {
      await $fetch("/api/admin/me/password", { method: "PUT", body });
      isChangingPassword.value = false;
    } catch (failure) {
      const isWrongPassword = (failure as { statusCode?: number }).statusCode === 400;
      passwordError.value = isWrongPassword
        ? "A senha atual está incorreta."
        : "Não foi possível alterar a senha.";
    } finally {
      isSavingPassword.value = false;
    }
  }

  return {
    user,
    name,
    nameError,
    isSavingName,
    hasNameChanged,
    saveName,
    isChangingPassword,
    passwords,
    passwordError,
    isSavingPassword,
    openPasswordForm,
    savePassword,
  };
}
