type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  dismissLabel?: string;
  pendingLabel: string;
  isDestructive?: boolean;
  toggle?: { label: string; isOn: boolean };
  action: (isToggleOn: boolean) => Promise<unknown>;
};

// One dialog for the whole app (mounted once in app.vue); it only opens from user clicks.
const current = shallowRef<ConfirmOptions | null>(null);
const isPending = ref(false);
const isToggleOn = ref(false);
const error = ref("");
let settle: ((isDone: boolean) => void) | null = null;

function finish(isDone: boolean) {
  current.value = null;
  settle?.(isDone);
  settle = null;
}

/**
 * Asks before an action and runs it from the dialog: the confirm button shows the pending
 * label while the action runs, and the dialog closes only when it succeeds (stays open with
 * an error otherwise). Resolves to true when the action ran, false when cancelled.
 */
export function useConfirmDialog() {
  function confirmAction(options: ConfirmOptions) {
    settle?.(false);
    error.value = "";
    isToggleOn.value = options.toggle?.isOn ?? false;
    current.value = options;
    return new Promise<boolean>((resolve) => {
      settle = resolve;
    });
  }

  async function accept() {
    if (!current.value || isPending.value) return;
    isPending.value = true;
    error.value = "";
    try {
      await current.value.action(isToggleOn.value);
      finish(true);
    } catch {
      error.value = "Não foi possível concluir. Tente novamente.";
    } finally {
      isPending.value = false;
    }
  }

  function cancel() {
    if (isPending.value) return;
    finish(false);
  }

  return { current, isPending, isToggleOn, error, confirmAction, accept, cancel };
}
