"use client";

import { Download, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { promptInstall, useCanPromptInstall } from "@/lib/pwa";
import { play } from "@/lib/sound";
import { Modal } from "./ui";

const PORTRAIT = "(orientation: portrait)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(PORTRAIT);
  mq.addEventListener("change", cb);
  window.addEventListener("resize", cb);
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener("resize", cb);
  };
}

export function usePortrait(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PORTRAIT).matches,
    () => false,
  );
}

/** True when launched from the home screen (the only way to get real full screen on iPhone). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Full screen + landscape lock where the browser allows it (Android/desktop). iPhone Safari does not. */
export async function enterFullscreen() {
  if (typeof document === "undefined" || isStandalone() || !window.matchMedia("(pointer: coarse)").matches) return;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else await el.webkitRequestFullscreen?.();
    }
  } catch {}
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
  } catch {}
}

export function InstallHint({ className = "" }: { className?: string }) {
  if (!isIOS() || isStandalone()) return null;
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-[13px] leading-snug text-white ${className}`}>
      <Share className="h-5 w-5 shrink-0" />
      <span>
        Pentru ecran complet pe iPhone: atinge <b>Partajare</b> în Safari, apoi <b>Adaugă pe ecranul principal</b> și pornește jocul de acolo.
      </span>
    </div>
  );
}

/** Covers everything while the phone is held upright: the game only runs in landscape. */
export function OrientationGate() {
  const portrait = usePortrait();
  if (!portrait) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[radial-gradient(120%_80%_at_50%_0%,#9b6bff_0%,#4b2398_45%,#1b1035_100%)] px-8 text-center text-white">
      <div className="rotate-phone flex h-28 w-28 items-center justify-center rounded-[32px] bg-white/15">
        <Smartphone className="h-16 w-16" strokeWidth={1.8} />
      </div>
      <h1 className="title-stroke mt-8 text-[30px] leading-tight font-bold">Rotește telefonul</h1>
      <p className="mt-2 max-w-[300px] text-[16px] font-medium text-white/85">Djesi Jewels se joacă doar pe orizontală. Întoarce telefonul și jocul pornește.</p>
      <InstallHint className="mt-6 max-w-[320px] text-left" />
    </div>
  );
}

/** "Install the game" button: native prompt where available, step-by-step guide otherwise. */
export function InstallButton({ className = "", label = "Instalează jocul" }: { className?: string; label?: string }) {
  const canPrompt = useCanPromptInstall();
  const [guide, setGuide] = useState(false);
  if (isStandalone()) return null;
  const ios = isIOS();
  return (
    <>
      <button
        onClick={async () => {
          play("tap");
          if (canPrompt) await promptInstall();
          else setGuide(true);
        }}
        className={`btn btn-blue ${className}`}
      >
        <Download className="h-5 w-5" strokeWidth={2.6} /> {label}
      </button>
      <Modal open={guide} onClose={() => setGuide(false)} title="Instalează Djesi Jewels" wide>
        <div className="grid grid-cols-2 gap-4 text-[14px] leading-snug">
          <div className={`panel-inset p-3 ${ios ? "ring-4 ring-[#4cb4ff]" : ""}`}>
            <div className="mb-1.5 text-[16px] font-bold">iPhone / iPad (Safari)</div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Atinge butonul <Share className="inline h-4 w-4 align-[-2px]" /> <b>Partajare</b> din bara Safari.
              </li>
              <li>
                Alege <b>Adaugă pe ecranul principal</b> <PlusSquare className="inline h-4 w-4 align-[-2px]" />.
              </li>
              <li>
                Apasă <b>Adaugă</b>, apoi pornește jocul din iconița nouă — se deschide pe tot ecranul.
              </li>
            </ol>
          </div>
          <div className={`panel-inset p-3 ${!ios ? "ring-4 ring-[#4cb4ff]" : ""}`}>
            <div className="mb-1.5 text-[16px] font-bold">Android (Chrome)</div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Atinge meniul <MoreVertical className="inline h-4 w-4 align-[-2px]" /> din colțul Chrome.
              </li>
              <li>
                Alege <b>Instalează aplicația</b> sau <b>Adaugă pe ecranul de pornire</b>.
              </li>
              <li>Confirmă — jocul apare printre aplicații și pornește pe tot ecranul.</li>
            </ol>
          </div>
        </div>
        <p className="mt-3 text-center text-[12.5px] text-ink-soft">
          Instalarea funcționează când jocul e deschis de pe o adresă https:// (pe Android este obligatoriu).
        </p>
      </Modal>
    </>
  );
}
