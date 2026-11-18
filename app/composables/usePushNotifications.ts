const SERVICE_WORKER_URL = "/sw.js";
const SUBSCRIPTIONS_URL = "/api/admin/push-subscriptions";

// Notifications are per device: the switch reflects this phone's browser subscription.
export function usePushNotifications() {
  const { vapidPublicKey } = useRuntimeConfig().public;
  const isSupported = ref(false);
  const isEnabled = ref(false);
  const isPending = ref(false);
  const error = ref("");

  const currentSubscription = async () =>
    (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription() ?? null;

  const saveSubscription = (subscription: PushSubscription) =>
    $fetch(SUBSCRIPTIONS_URL, { method: "POST", body: subscription.toJSON() });

  onMounted(async () => {
    isSupported.value = !!vapidPublicKey && "serviceWorker" in navigator && "PushManager" in window;
    if (!isSupported.value) return;
    const subscription = await currentSubscription();
    isEnabled.value = !!subscription;
    // Re-sent on every visit, so the server keeps it under whoever is signed in on this phone.
    if (subscription) await saveSubscription(subscription).catch(() => undefined);
  });

  async function enable() {
    if ((await Notification.requestPermission()) !== "granted") {
      error.value = "Permita as notificações deste site nas configurações do celular.";
      return;
    }
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });
    await saveSubscription(subscription);
    isEnabled.value = true;
  }

  async function disable() {
    const subscription = await currentSubscription();
    if (subscription) {
      await $fetch(SUBSCRIPTIONS_URL, {
        method: "DELETE",
        body: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }
    isEnabled.value = false;
  }

  async function setEnabled(isOn: boolean) {
    error.value = "";
    isPending.value = true;
    try {
      await (isOn ? enable() : disable());
    } catch {
      error.value = "Não foi possível alterar as notificações. Tente novamente.";
    } finally {
      isPending.value = false;
    }
  }

  return { isSupported, isEnabled, isPending, error, setEnabled };
}
