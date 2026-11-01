"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { BoosterId } from "@/lib/game/economy";
import { useGame } from "@/lib/store";
import { play } from "@/lib/sound";
import { HammerArt, ShuffleArt, SpecialArt } from "./art/Pieces";

export function Modal({
  open,
  onClose,
  children,
  title,
  wide,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-[max(env(safe-area-inset-left),16px)] py-[max(env(safe-area-inset-bottom),8px)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#140a2e]/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            className={`panel relative w-full ${wide ? "max-w-[640px]" : "max-w-[400px]"} max-h-[94dvh] overflow-hidden`}
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            {title && (
              <div className="relative -mx-[3px] -mt-[3px] rounded-t-[24px] bg-gradient-to-b from-[#9d6bff] to-[#6a35d6] px-12 py-2 text-center">
                <h2 className="title-stroke text-[22px] leading-tight font-bold">{title}</h2>
              </div>
            )}
            {onClose && (
              <button
                aria-label="Închide"
                onClick={() => {
                  play("tap");
                  onClose();
                }}
                className="btn btn-red absolute right-2 top-1.5 z-10 h-9 w-9 rounded-full!"
              >
                <X className="h-5 w-5" strokeWidth={3.5} />
              </button>
            )}
            <div className="no-scrollbar max-h-[calc(94dvh-52px)] overflow-y-auto p-3.5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Round blue "puck" button holding a booster, as on the in-game tool board. */
export function BoosterIcon({ id, className = "h-14 w-14" }: { id: BoosterId; className?: string }) {
  const inner = (() => {
    switch (id) {
      case "hammer":
        return (
          <div className="h-[78%] w-[78%]">
            <HammerArt />
          </div>
        );
      case "shuffle":
        return (
          <div className="h-[72%] w-[72%]">
            <ShuffleArt />
          </div>
        );
      case "row":
      case "preRocket":
        return (
          <div className="h-[78%] w-[78%]">
            <SpecialArt kind="rocketH" />
          </div>
        );
      case "col":
        return (
          <div className="h-[78%] w-[78%]">
            <SpecialArt kind="rocketV" />
          </div>
        );
      case "preBomb":
        return (
          <div className="h-[78%] w-[78%]">
            <SpecialArt kind="bomb" />
          </div>
        );
      case "preRainbow":
        return (
          <div className="h-[74%] w-[74%]">
            <SpecialArt kind="rainbow" />
          </div>
        );
    }
  })();
  return <div className={`puck relative flex items-center justify-center ${className}`}>{inner}</div>;
}

export function Avatar({ emoji, className = "h-11 w-11 text-2xl", ring = "ring-white" }: { emoji: string; className?: string; ring?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#fff4d6] to-[#ffd98a] ring-[3px] ${ring} ${className}`}
      style={{ boxShadow: "0 3px 0 rgb(0 0 0 / 0.2)" }}
    >
      <span className="leading-none">{emoji}</span>
    </div>
  );
}

export function Toaster() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={`rounded-2xl px-4 py-2.5 text-[15px] font-semibold text-white shadow-lg ${
              t.tone === "error" ? "bg-[#e5383b]" : t.tone === "success" ? "bg-[#2f9e44]" : "bg-[#5b2fd0]"
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ro-RO");
}

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 2) return "activ acum";
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 30) return `acum ${d} zile`;
  return "de mult";
}
