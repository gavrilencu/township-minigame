"use client";

import { Map as MapIcon, Plus, ShoppingBag, Trophy, Users } from "lucide-react";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { Coin, StarShape } from "./art/Pieces";
import { Avatar, formatNumber } from "./ui";

export type Tab = "map" | "shop" | "friends" | "ranks";

/** Width of the left navigation rail, safe area excluded. */
export const RAIL = 84;

const TABS: { id: Tab; label: string; Icon: typeof MapIcon }[] = [
  { id: "map", label: "Hartă", Icon: MapIcon },
  { id: "shop", label: "Magazin", Icon: ShoppingBag },
  { id: "friends", label: "Prieteni", Icon: Users },
  { id: "ranks", label: "Clasament", Icon: Trophy },
];

export function SideRail({ tab, onTab, onProfile }: { tab: Tab; onTab: (t: Tab) => void; onProfile: () => void }) {
  const player = useGame((s) => s.player)!;
  return (
    <nav
      className="absolute inset-y-0 left-0 z-30 flex flex-col items-center py-[max(env(safe-area-inset-bottom),8px)] pl-[env(safe-area-inset-left)]"
      style={{ width: `calc(env(safe-area-inset-left) + ${RAIL}px)` }}
    >
      <div className="glass flex h-full w-[74px] flex-col items-center gap-1 rounded-[26px] p-1.5">
        <button
          onClick={() => {
            play("tap");
            onProfile();
          }}
          className="mb-1 flex flex-col items-center active:scale-95"
          aria-label="Profilul meu"
        >
          <Avatar emoji={player.avatar} className="h-11 w-11 text-[26px]" />
          <span className="mt-0.5 max-w-[66px] truncate text-[11px] font-bold text-white">{player.username}</span>
        </button>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => {
                play("tap");
                onTab(id);
              }}
              className={`relative flex w-full flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors ${
                active ? "bg-gradient-to-b from-[#ffd567] to-[#f59f1a] text-white shadow-[0_3px_0_#b86a0a]" : "text-white/75"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 2.2} />
              <span className="text-[10.5px] font-bold">{label}</span>
              {id === "shop" && player.dailyAvailable && (
                <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff4d6d] ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function Resources({ onShop }: { onShop: () => void }) {
  const player = useGame((s) => s.player)!;
  return (
    <div className="pointer-events-none absolute right-0 top-0 z-30 flex gap-2 pr-[max(env(safe-area-inset-right),10px)] pt-[max(env(safe-area-inset-top),8px)]">
      <div className="glass pointer-events-auto flex h-10 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-white">
        <StarShape filled className="h-7 w-7" />
        <span className="text-[16px] font-bold tabular-nums">{formatNumber(player.totalStars)}</span>
      </div>
      <button
        onClick={() => {
          play("tap");
          onShop();
        }}
        className="glass pointer-events-auto flex h-10 items-center gap-1.5 rounded-full pl-1.5 pr-1 text-white active:scale-95"
      >
        <Coin className="h-7 w-7" />
        <span className="text-[16px] font-bold tabular-nums">{formatNumber(player.coins)}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f9e44]">
          <Plus className="h-4 w-4" strokeWidth={4} />
        </span>
      </button>
    </div>
  );
}
