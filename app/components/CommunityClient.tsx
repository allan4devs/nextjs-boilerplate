"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Copy, Loader2, Trophy, UserPlus, Users } from "lucide-react";

type Snapshot = {
  month: string;
  leaderboardOptIn: boolean;
  leaderboard: Array<{ firstName: string; monthlyXp: number; rank: number; league: { name: string }; memberKey?: string }>;
  league: { name: string; progressPct: number; nextXp: number | null };
  referralCode: string;
  referralCount: number;
  buddies: Array<{ memberKey: string; firstName: string; lastWorkoutDate: string | null }>;
  pendingRequests: Array<{ memberKey: string; firstName: string }>;
};

function vapidKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export default function CommunityClient() {
  const [memberName, setMemberName] = useState("");
  const [data, setData] = useState<Snapshot | null>(null);
  const [target, setTarget] = useState("");
  const [referral, setReferral] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("xtreme-gym-member-name") || "";
    setMemberName(name);
    if (!name) return;
    if ("serviceWorker" in navigator && "PushManager" in window) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then(setPushSubscription);
    }
    fetch("/api/xtreme/social", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Ingresá tu PIN en la app para ver la comunidad.");
        setData(json);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo cargar."));
  }, []);

  async function action(actionName: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/xtreme/social", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, ...extra }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo guardar.");
      setData(json);
      setTarget("");
      setReferral("");
      setMessage(
        typeof json.message === "string"
          ? json.message
          : "Listo. Tu comunidad quedó actualizada.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    setBusy(true); setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Este navegador no admite notificaciones push.");
      }
      const configResponse = await fetch("/api/xtreme/push");
      const config = await configResponse.json();
      if (!config.configured || !config.publicKey) {
        throw new Error("Push todavía no está configurado en el servidor.");
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey(config.publicKey),
        }));
      const response = await fetch("/api/xtreme/push", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "No se pudo activar push.");
      setPushSubscription(subscription);
      setMessage("Notificaciones activadas en este dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo activar push.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    if (!pushSubscription) return;
    setBusy(true); setMessage("");
    try {
      const endpoint = pushSubscription.endpoint;
      const response = await fetch("/api/xtreme/push", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      if (!response.ok) throw new Error("No se pudo desactivar push.");
      await pushSubscription.unsubscribe();
      setPushSubscription(null);
      setMessage("Notificaciones desactivadas en este dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar push.");
    } finally {
      setBusy(false);
    }
  }

  if (!memberName) return <main className="min-h-screen bg-[#080808] px-5 py-20 text-white"><div className="mx-auto max-w-xl border border-white/10 p-8"><h1 className="text-3xl font-black uppercase">Entrá primero a tu perfil</h1><a href="/app" className="mt-6 inline-block bg-[#d8ff3e] px-5 py-3 font-black uppercase text-black">Abrir app</a></div></main>;
  // Sesión vencida o error al cargar: no dejar el spinner infinito — mandar a re-login en /app.
  if (!data && message) return <main className="min-h-screen bg-[#080808] px-5 py-20 text-white"><div className="mx-auto max-w-xl border border-white/10 p-8"><h1 className="text-3xl font-black uppercase">Sesión requerida</h1><p className="mt-4 text-sm font-bold text-white/60">{message}</p><a href="/app" className="mt-6 inline-block bg-[#d8ff3e] px-5 py-3 font-black uppercase text-black">Ingresar PIN en la app</a></div></main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-[#080808] text-[#d8ff3e]"><Loader2 className="h-8 w-8 animate-spin" /><span className="sr-only">Cargando comunidad</span></main>;

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#d8ff3e]">Fase social</p><h1 className="mt-3 text-5xl font-black uppercase">Comunidad Xtreme</h1>
        {message && <p className="mt-5 border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 p-3 text-sm font-bold text-[#eaff93]">{message}</p>}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black uppercase"><Trophy className="text-yellow-300" />Liga {data.month}</h2><button disabled={busy} onClick={() => void action("leaderboard", { enabled: !data.leaderboardOptIn })} className="border border-white/15 px-3 py-2 text-xs font-black uppercase">{data.leaderboardOptIn ? "Salir" : "Participar"}</button></div>
            <p className="mt-2 text-sm text-white/50">Solo mostramos el primer nombre. Tu liga actual: <strong className="text-white">{data.league.name}</strong>.</p>
            <div className="mt-5 space-y-2">{data.leaderboard.map((entry) => <div key={`${entry.rank}-${entry.firstName}`} className="flex items-center gap-3 border border-white/10 p-3"><span className="grid h-8 w-8 place-items-center bg-white/10 font-black">{entry.rank}</span><span className="flex-1 font-black uppercase">{entry.firstName}</span><span className="text-sm font-bold text-[#d8ff3e]">{entry.monthlyXp} XP</span></div>)}</div>
          </section>
          <section className="border border-white/10 bg-white/[.04] p-5">
            <h2 className="flex items-center gap-2 text-xl font-black uppercase"><UserPlus className="text-[#d8ff3e]" />Traé un amigo</h2><p className="mt-2 text-sm text-white/50">Ambos ganan 7 días cuando el nuevo socio hace su primer ingreso con plan o pase pagado.</p>
            <div className="mt-5 flex gap-2"><code className="flex-1 bg-black/40 p-3 text-lg font-black text-[#d8ff3e]">{data.referralCode}</code><button onClick={() => void navigator.clipboard.writeText(data.referralCode)} className="border border-white/15 p-3" aria-label="Copiar código"><Copy /></button></div>
            <p className="mt-2 text-xs font-bold text-white/40">Referidos completados: {data.referralCount}</p>
            <div className="mt-5 flex gap-2"><input value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Código de quien te invitó" className="min-w-0 flex-1 border border-white/15 bg-black/30 px-3 py-2 outline-none" /><button disabled={busy || !referral} onClick={() => void action("referral-redeem", { code: referral })} className="bg-[#d8ff3e] px-4 font-black uppercase text-black disabled:opacity-40">Canjear</button></div>
          </section>
          <section className="border border-white/10 bg-white/[.04] p-5">
            <h2 className="flex items-center gap-2 text-xl font-black uppercase"><Users className="text-cyan-300" />Compas de entreno</h2>
            <div className="mt-4 flex gap-2"><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Nombre completo del socio" className="min-w-0 flex-1 border border-white/15 bg-black/30 px-3 py-2 outline-none" /><button disabled={busy || !target} onClick={() => void action("buddy-request", { target })} className="bg-cyan-300 px-4 font-black uppercase text-black disabled:opacity-40">Invitar</button></div>
            {data.pendingRequests.map((request) => <div key={request.memberKey} className="mt-3 flex items-center gap-3 border border-cyan-300/20 p-3"><span className="flex-1 font-bold">{request.firstName} quiere ser tu compa</span><button onClick={() => void action("buddy-accept", { target: request.memberKey })} className="p-2 text-[#d8ff3e]" aria-label="Aceptar"><Check /></button></div>)}
            {data.buddies.map((buddy) => <div key={buddy.memberKey} className="mt-3 flex justify-between border border-white/10 p-3"><span className="font-black uppercase">{buddy.firstName}</span><span className="text-xs font-bold text-white/45">{buddy.lastWorkoutDate ? `Entrenó ${buddy.lastWorkoutDate}` : "Sin entrenos"}</span></div>)}
          </section>
          <section className="border border-white/10 bg-gradient-to-br from-[#d8ff3e]/10 to-transparent p-5"><h2 className="flex items-center gap-2 text-xl font-black uppercase"><Bell className="text-[#d8ff3e]" />Avisos en el celular</h2><p className="mt-2 text-sm leading-6 text-white/55">Recibí alertas de racha, renovación y tu resumen mensual aunque la app esté cerrada.</p>{pushSubscription ? <button disabled={busy} onClick={() => void disablePush()} className="mt-5 border border-white/20 px-5 py-3 font-black uppercase text-white disabled:opacity-40">Desactivar en este dispositivo</button> : <button disabled={busy} onClick={() => void enablePush()} className="mt-5 bg-[#d8ff3e] px-5 py-3 font-black uppercase text-black disabled:opacity-40">Activar notificaciones</button>}</section>
        </div>
      </div>
    </main>
  );
}
