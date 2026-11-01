"use client";

import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { BOOSTERS, BUNDLES, INGAME_BOOSTERS, PRE_BOOSTERS, type BoosterId, type Bundle } from "@/lib/game/economy";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { Coin } from "../art/Pieces";
import { BoosterIcon } from "../ui";

export function ShopScreen({ onDaily }: { onDaily: () => void }) {
  const player = useGame((s) => s.player)!;
  const setPlayer = useGame((s) => s.setPlayer);
  const toast = useGame((s) => s.toast);
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(item: BoosterId | string, name: string) {
    setBusy(item);
    try {
      const r = await api.buy(player.username, item);
      setPlayer(r.player);
      play("coin");
      toast(`${name} — cumpărat!`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const priceButton = (id: string, price: number, name: string) => (
    <button
      onClick={() => buy(id, name)}
      disabled={busy !== null || player.coins < price}
      className="btn btn-green h-10 w-full text-[16px]"
    >
      {busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : price}
      <Coin className="h-5 w-5" />
    </button>
  );

  const boosterCard = (id: BoosterId) => (
    <div key={id} className="panel flex flex-col items-center rounded-[20px]! p-3 text-center">
      <div className="relative">
        <BoosterIcon id={id} className="h-16 w-16" />
        <span className="absolute -bottom-1 -right-2 rounded-full bg-[#5b2fd0] px-2 py-0.5 text-[12px] font-bold text-white ring-2 ring-white">
          ×{player.boosters[id] ?? 0}
        </span>
      </div>
      <div className="mt-2 text-[15px] leading-tight font-bold">{BOOSTERS[id].name}</div>
      <p className="mt-0.5 mb-2 flex-1 text-[12px] leading-snug text-ink-soft">{BOOSTERS[id].desc}</p>
      {priceButton(id, BOOSTERS[id].price, BOOSTERS[id].name)}
    </div>
  );

  const bundleCard = (b: Bundle) => {
    const value = Object.entries(b.items).reduce((s, [id, n]) => s + BOOSTERS[id as BoosterId].price * (n ?? 0), 0);
    const off = Math.round((1 - b.price / value) * 100);
    return (
      <div key={b.id} className="panel relative overflow-hidden rounded-[22px]! p-3">
        <span className="absolute right-0 top-0 rounded-bl-2xl bg-[#e03131] px-3 py-1 text-[13px] font-bold text-white">-{off}%</span>
        <div className="text-[17px] font-bold">{b.name}</div>
        <div className="text-[12px] text-ink-soft">{b.desc}</div>
        <div className="my-2.5 flex flex-wrap gap-2">
          {Object.entries(b.items).map(([id, n]) => (
            <div key={id} className="relative">
              <BoosterIcon id={id as BoosterId} className="h-11 w-11" />
              <span className="absolute -bottom-1 -right-1.5 rounded-full bg-[#5b2fd0] px-1.5 text-[11px] font-bold text-white ring-2 ring-white">×{n}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold text-ink-soft line-through">{value}</span>
          <div className="flex-1">
            {priceButton(b.id, b.price, b.name)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-[max(env(safe-area-inset-bottom),14px)] pl-3 pr-[max(env(safe-area-inset-right),14px)] pt-[max(env(safe-area-inset-top),8px)]">
      <h1 className="title-stroke flex h-10 items-center text-[30px] font-bold">Magazin</h1>

      {player.dailyAvailable && (
        <button onClick={onDaily} className="shine mt-3 flex w-full items-center gap-3 rounded-[22px] bg-gradient-to-r from-[#ff8ad8] to-[#d6336c] p-3 text-left text-white shadow-[0_5px_0_#9c1f4f]">
          <Gift className="wiggle h-11 w-11 shrink-0" />
          <div className="flex-1">
            <div className="text-[18px] font-bold">Cadoul zilnic te așteaptă!</div>
            <div className="text-[13px] opacity-90">Ziua {((player.dailyNext - 1) % 7) + 1} din 7 — atinge ca să-l iei</div>
          </div>
        </button>
      )}

      <h2 className="mt-4 mb-2 text-[18px] font-bold text-white">Ajutoare în joc</h2>
      <div className="grid grid-cols-4 gap-3">
        {INGAME_BOOSTERS.map(boosterCard)}
      </div>

      <h2 className="mt-4 mb-2 text-[18px] font-bold text-white">Ajutoare la start</h2>
      <div className="grid grid-cols-4 gap-3">
        {PRE_BOOSTERS.map(boosterCard)}
      </div>

      <h2 className="mt-4 mb-2 text-[18px] font-bold text-white">Pachete avantajoase</h2>
      <div className="grid grid-cols-2 gap-3">
        {BUNDLES.map(bundleCard)}
      </div>
      <p className="mt-4 text-center text-[13px] text-white/70">Câștigă monede trecând nivele, cu mai multe stele și mutări rămase.</p>
    </div>
  );
}
