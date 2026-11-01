"use client";

import { useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Chrome/Edge/Samsung fire this once, early: keep it so the game can offer its own "Install" button.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** True when the browser can show its native install dialog right now. */
export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  return (await ev.userChoice).outcome === "accepted";
}

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
