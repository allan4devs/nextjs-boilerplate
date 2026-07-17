/**
 * Cliente Web Push para Member OS / PWA.
 * Maneja detección (iOS standalone, HTTPS), permisos, suscripción VAPID
 * y registro en /api/xtreme/push.
 */

export type PushBlockReason =
  | "unsupported"
  | "insecure"
  | "no-sw"
  | "ios-not-standalone"
  | "not-configured"
  | "permission-denied"
  | "no-session";

export type PushCapability = {
  /** El entorno puede usar Web Push (con o sin pasos extra). */
  supported: boolean;
  /** Listo para suscribirse ahora (permiso no denegado, SW ok, etc.). */
  canSubscribe: boolean;
  reason?: PushBlockReason;
  message: string;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | "unsupported";
  configured: boolean;
  publicKey: string;
};

export type PushDeviceState = {
  active: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission | "unsupported";
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se reporta como MacIntel con touch.
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isSecureContextOk() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

/** Convierte la VAPID public key (URL-safe base64) a Uint8Array. */
export function vapidApplicationServerKey(value: string): Uint8Array {
  const trimmed = value.trim();
  const padded = `${trimmed}${"=".repeat((4 - (trimmed.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta service workers.");
  }

  // En dev PwaRuntime desregistra el SW; registramos uno aquí si hace falta
  // para poder probar push en localhost con HTTPS o flags.
  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }
  return navigator.serviceWorker.ready;
}

export async function fetchPushConfig(): Promise<{ configured: boolean; publicKey: string }> {
  const response = await fetch("/api/xtreme/push", { cache: "no-store", credentials: "same-origin" });
  const data = (await response.json().catch(() => ({}))) as {
    configured?: boolean;
    publicKey?: string;
  };
  return {
    configured: Boolean(data.configured && data.publicKey),
    publicKey: String(data.publicKey ?? ""),
  };
}

export async function getPushCapability(): Promise<PushCapability> {
  const permission: NotificationPermission | "unsupported" =
    typeof Notification === "undefined" ? "unsupported" : Notification.permission;

  if (!isSecureContextOk()) {
    return {
      supported: false,
      canSubscribe: false,
      reason: "insecure",
      message: "Las notificaciones push solo funcionan en HTTPS (o localhost).",
      isIos: isIosDevice(),
      isStandalone: isStandaloneDisplay(),
      permission,
      configured: false,
      publicKey: "",
    };
  }

  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    typeof Notification === "undefined"
  ) {
    return {
      supported: false,
      canSubscribe: false,
      reason: "unsupported",
      message: "Este navegador no admite notificaciones push.",
      isIos: isIosDevice(),
      isStandalone: isStandaloneDisplay(),
      permission,
      configured: false,
      publicKey: "",
    };
  }

  const isIos = isIosDevice();
  const standalone = isStandaloneDisplay();

  // iOS/iPadOS: Web Push solo en la app instalada (pantalla de inicio), iOS 16.4+.
  if (isIos && !standalone) {
    return {
      supported: true,
      canSubscribe: false,
      reason: "ios-not-standalone",
      message:
        "En iPhone/iPad: tocá Compartir → “Agregar a pantalla de inicio” y abrí Xtreme desde ahí. Después podés activar los avisos.",
      isIos: true,
      isStandalone: false,
      permission,
      configured: false,
      publicKey: "",
    };
  }

  if (permission === "denied") {
    return {
      supported: true,
      canSubscribe: false,
      reason: "permission-denied",
      message:
        "Bloqueaste las notificaciones. En el candado del navegador (o Ajustes → Xtreme) permití avisos y volvé a intentar.",
      isIos,
      isStandalone: standalone,
      permission,
      configured: false,
      publicKey: "",
    };
  }

  let config = { configured: false, publicKey: "" };
  try {
    config = await fetchPushConfig();
  } catch {
    // El capability igual reporta el resto; al activar se reintenta.
  }

  if (!config.configured || !config.publicKey) {
    return {
      supported: true,
      canSubscribe: false,
      reason: "not-configured",
      message: "Push todavía no está configurado en el servidor (faltan llaves VAPID).",
      isIos,
      isStandalone: standalone,
      permission,
      configured: false,
      publicKey: "",
    };
  }

  return {
    supported: true,
    canSubscribe: true,
    message: "Listo para activar avisos en este dispositivo.",
    isIos,
    isStandalone: standalone,
    permission,
    configured: true,
    publicKey: config.publicKey,
  };
}

export async function getPushDeviceState(): Promise<PushDeviceState> {
  const permission: NotificationPermission | "unsupported" =
    typeof Notification === "undefined" ? "unsupported" : Notification.permission;

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { active: false, subscription: null, permission };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      return { active: false, subscription: null, permission };
    }
    const subscription = await registration.pushManager.getSubscription();
    return {
      active: Boolean(subscription),
      subscription,
      permission,
    };
  } catch {
    return { active: false, subscription: null, permission };
  }
}

/**
 * Pide permiso, suscribe al push manager y registra el endpoint en el server.
 * Debe llamarse desde un gesto del usuario (tap).
 */
export async function enablePushOnThisDevice(): Promise<{
  subscription: PushSubscription;
  message: string;
}> {
  const capability = await getPushCapability();
  if (!capability.canSubscribe) {
    throw new Error(capability.message);
  }

  // Pedir permiso EXPLÍCITO antes de subscribe (requerido en varios móviles).
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Bloqueaste las notificaciones. Permitilas en el navegador y reintentá."
        : "No se otorgó permiso para notificaciones.",
    );
  }

  const registration = await ensureServiceWorker();
  // Esperar a que el SW controle la página (importante en primer registro).
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const onController = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onController);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onController);
      // Fallback si ya hay controller o el evento no llega.
      window.setTimeout(resolve, 1500);
    });
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidApplicationServerKey(capability.publicKey) as BufferSource,
    });
  }

  const response = await fetch("/api/xtreme/push", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    // Si el server rechaza (ej. sin sesión), limpiamos la sub local para no dejar estado a medias.
    if (response.status === 401 || response.status === 403) {
      try {
        await subscription.unsubscribe();
      } catch {
        // ignore
      }
      throw new Error("Entrá con tu PIN en la app y volvé a activar las notificaciones.");
    }
    throw new Error(data.error || "No se pudo registrar el dispositivo para push.");
  }

  return {
    subscription,
    message: "Notificaciones activadas en este dispositivo. Vas a recibir rachas, renovación y resúmenes.",
  };
}

export async function disablePushOnThisDevice(): Promise<string> {
  const state = await getPushDeviceState();
  const subscription = state.subscription;
  if (!subscription) return "No había notificaciones activas en este dispositivo.";

  const endpoint = subscription.endpoint;
  try {
    await fetch("/api/xtreme/push", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Igual intentamos desuscribir localmente.
  }

  try {
    await subscription.unsubscribe();
  } catch {
    // Endpoint ya inválido del lado del browser.
  }

  return "Notificaciones desactivadas en este dispositivo.";
}

/** Envía un push de prueba vía el servidor (requiere sesión + sub activa). */
export async function sendTestPush(): Promise<string> {
  const response = await fetch("/api/xtreme/push", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test" }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    sent?: number;
  };
  if (!response.ok) {
    throw new Error(data.error || "No se pudo enviar el aviso de prueba.");
  }
  return data.message || (data.sent ? "Aviso de prueba enviado." : "Sin dispositivos registrados.");
}

/**
 * Notificación local inmediata (sin pasar por el servidor).
 * Sirve para verificar que el permiso + SW funcionan en el dispositivo.
 */
export async function showLocalTestNotification(): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    throw new Error("Primero activá las notificaciones en este dispositivo.");
  }
  const registration = await ensureServiceWorker();
  await registration.showNotification("Xtreme Gym · listo", {
    body: "Si ves esto, los avisos en este celular ya funcionan. ¡Pura vida!",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: "xtreme-local-test",
    data: { url: "/app" },
  });
}
