"use client";

import { Crown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RankRow } from "@/lib/shared";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { StarShape } from "../art/Pieces";
import { Avatar, formatNumber } from "../ui";

const MEDAL = ["#ffd23f", "#ced4da", "#e8a15a"];

export function LeaderboardScreen() {
  const player = useGame((s) => s.player)!;
  const toast = useGame((s) => s.toast);
  const [scope, setScope] = useState<"friends" | "global">("friends");
  const [data, setData] = useState<{ scope: string; rows: RankRow[]; me: RankRow | null } | null>(null);

  useEffect(() => {
    let live = true;
    api
      .leaderboard(player.username, scope)
      .then((r) => live && setData({ scope, ...r }))
      .catch((e: Error) => live && toast(e.message, "error"));
    return () => {
      live = false;
    };
  }, [scope, player.username, toast]);

  const rows = data?.scope === scope ? data.rows : null;
  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const meVisible = rows?.some((r) => r.isMe);

  return (
    <div className="flex h-full gap-4 pb-[max(env(safe-area-inset-bottom),10px)] pl-3 pr-[max(env(safe-area-inset-right),14px)] pt-[max(env(safe-area-inset-top),8px)]">
      <div className="flex w-[42%] shrink-0 flex-col">
        <h1 className="title-stroke flex h-10 items-center text-[30px] font-bold">Clasament</h1>
        <div className="glass mt-2 flex w-full rounded-full p-1">
          {(["friends", "global"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                play("tap");
                setScope(s);
              }}
              className={`flex-1 rounded-full py-2 text-[15px] font-bold transition ${scope === s ? "bg-white text-ink shadow" : "text-white/80"}`}
            >
              {s === "friends" ? "Prieteni" : "Global"}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-end justify-center gap-2 pb-1">
          {rows &&
            [1, 0, 2].map((i) => {
              const r = podium[i];
              if (!r) return <div key={i} className="w-[30%]" />;
              return (
                <div key={r.username} className="flex w-[30%] flex-col items-center">
                  {i === 0 && <Crown className="-mb-1 h-7 w-7 fill-[#ffd23f] text-[#e08a00]" />}
                  <Avatar emoji={r.avatar} className={i === 0 ? "h-14 w-14 text-[32px]" : "h-12 w-12 text-[26px]"} ring={r.isMe ? "ring-[#ff8fd0]" : "ring-white"} />
                  <div className="mt-1 w-full truncate text-center text-[13px] font-bold text-white">{r.isMe ? "Tu" : r.username}</div>
                  <div
                    className="mt-1 flex w-full flex-col items-center rounded-t-2xl pt-1.5 text-[#3b2a00]"
                    style={{ height: i === 0 ? 74 : i === 1 ? 56 : 44, background: `linear-gradient(180deg, ${MEDAL[i]}, ${MEDAL[i]}aa)` }}
                  >
                    <span className="text-[20px] leading-none font-bold">{r.rank}</span>
                    <span className="text-[11px] font-bold">Nivel {r.level}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pb-16 pt-12">
          {!rows ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              {rest.map((r) => (
                <Row key={r.username} r={r} />
              ))}
              {rows.length <= 3 && (
                <p className="px-2 pt-6 text-center text-[14px] text-white/80">
                  {scope === "friends" ? "Adaugă prieteni ca să te întreci cu ei aici." : "Încă puțini jucători — fii primul în clasament!"}
                </p>
              )}
            </>
          )}
        </div>
        {rows && !meVisible && data?.me && (
          <div className="absolute inset-x-0 bottom-0">
            <Row r={data.me} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ r }: { r: RankRow }) {
  return (
    <div className={`panel flex items-center gap-3 rounded-[18px]! p-2.5 ${r.isMe ? "bg-[linear-gradient(180deg,#fff3bf,#ffe08a)]!" : ""}`}>
      <span className="w-8 text-center text-[18px] font-bold text-ink-soft">{r.rank}</span>
      <Avatar emoji={r.avatar} className="h-10 w-10 text-[22px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold">{r.isMe ? `${r.username} (tu)` : r.username}</div>
        <div className="flex items-center gap-1 text-[12px] font-semibold text-ink-soft">
          <StarShape filled className="h-3.5 w-3.5" /> {formatNumber(r.totalStars)} · {formatNumber(r.totalScore)} pct
        </div>
      </div>
      <div className="text-right text-[15px] font-bold">Nivel {r.level}</div>
    </div>
  );
}
