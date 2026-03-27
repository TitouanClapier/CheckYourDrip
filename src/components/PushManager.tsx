"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "denied" | "unsubscribed" | "subscribed" | "loading";

export default function PushManager() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    checkState();
  }, []);

  async function checkState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager?.getSubscription();
    setState(sub ? "subscribed" : "unsubscribed");
  }

  async function subscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setState("subscribed");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setState("unsubscribed");
    }
  }

  async function unsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "loading") {
    return (
      <div className="h-9 w-9 sm:w-40 animate-pulse rounded-lg bg-surface-elevated" />
    );
  }

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <span className="rounded-lg bg-yellow-500/10 px-2.5 py-2 text-xs text-yellow-400 border border-yellow-500/30">
        <span className="hidden sm:inline">Notifications bloquées dans le navigateur</span>
        <span className="sm:hidden" title="Notifications bloquées dans le navigateur">🔕</span>
      </span>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="flex items-center gap-2 rounded-lg bg-green-500/10 px-2.5 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/30"
      >
        <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
        <span className="hidden sm:inline">Push activé</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-2 text-sm text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/30"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span className="hidden sm:inline">Activer les notifications push</span>
    </button>
  );
}

