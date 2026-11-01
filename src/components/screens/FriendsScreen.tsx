"use client";

import { Check, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FriendDTO } from "@/lib/shared";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { StarShape } from "../art/Pieces";
import { Avatar, formatNumber, timeAgo } from "../ui";

type Found = FriendDTO & { isFriend: boolean };

export function FriendsScreen({ onOpenFriend }: { onOpenFriend: (f: FriendDTO) => void }) {
  const player = useGame((s) => s.player)!;
  const friends = useGame((s) => s.friends);
  const setFriends = useGame((s) => s.setFriends);
  const toast = useGame((s) => s.toast);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    api
      .friends(player.username)
      .then((r) => setFriends(r.friends))
      .catch(() => {});
  }, [player.username, setFriends]);

  const query = q.trim();
  useEffect(() => {
    if (!query) return;
    const t = setTimeout(() => {
      api
        .search(player.username, query)
        .then((r) => setFound(r.players))
        .catch((e: Error) => toast(e.message, "error"))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, player.username, toast]);
  const shown = query ? found : null;

  async function add(name: string) {
    setAdding(name);
    try {
      const r = await api.addFriend(player.username, name);
      setFriends(r.friends);
      setFound((list) => list?.map((p) => (p.username === name ? { ...p, isFriend: true } : p)) ?? null);
      play("coin");
      toast(`${name} e acum prietenul tău!`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="flex h-full flex-col pb-[max(env(safe-area-inset-bottom),10px)] pl-3 pr-[max(env(safe-area-inset-right),14px)] pt-[max(env(safe-area-inset-top),8px)]">
      <h1 className="title-stroke flex h-10 items-center text-[30px] font-bold">Prieteni</h1>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-4">
        <div className="no-scrollbar min-h-0 overflow-y-auto pb-2">
          <div className="panel flex items-center gap-2 rounded-[20px]! px-3 py-1">
            <Search className="h-5 w-5 shrink-0 text-ink-soft" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearching(!!e.target.value.trim());
              }}
              placeholder="Caută după username…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-ink outline-none placeholder:text-[#bfae94]"
            />
            {searching ? (
              <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            ) : (
              q && (
                <button
                  onClick={() => {
                    setQ("");
                    setFound(null);
                  }}
                  aria-label="Șterge căutarea"
                >
                  <X className="h-5 w-5 text-ink-soft" />
                </button>
              )
            )}
          </div>

          {shown && (
            <div className="mt-3 space-y-2">
              {shown.length === 0 && !searching && <p className="text-center text-[14px] text-white/80">Niciun jucător găsit cu „{query}”.</p>}
              {shown.map((p) => (
                <div key={p.username} className="panel flex items-center gap-3 rounded-[18px]! p-2.5">
                  <Avatar emoji={p.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold">{p.username}</div>
                    <div className="text-[12px] text-ink-soft">Nivelul {p.level}</div>
                  </div>
                  {p.isFriend ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#d3f9d8] px-3 py-1.5 text-[13px] font-bold text-[#2b8a3e]">
                      <Check className="h-4 w-4" strokeWidth={3} /> Prieten
                    </span>
                  ) : (
                    <button onClick={() => add(p.username)} disabled={adding !== null} className="btn btn-green h-10 px-3.5 text-[15px]">
                      {adding === p.username ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Adaugă
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!shown && (
            <p className="mt-3 px-1 text-[14px] text-white/85">
              Caută prietenii după username și adaugă-i. Le vei vedea nivelul pe hartă și scorurile pe fiecare nivel. Username-ul tău: <b>{player.username}</b>
            </p>
          )}
        </div>
        <div className="no-scrollbar min-h-0 overflow-y-auto pb-2">
          <h2 className="mb-2 flex items-center gap-2 text-[18px] font-bold text-white">
            Prietenii mei <span className="rounded-full bg-white/20 px-2 text-[14px]">{friends.length}</span>
          </h2>
          {friends.length === 0 ? (
            <div className="glass rounded-[22px] p-5 text-center text-white">
              <Users className="mx-auto h-12 w-12 opacity-80" />
              <p className="mt-2 text-[16px] font-bold">Încă nu ai prieteni aici</p>
              <p className="mt-1 text-[14px] opacity-80">
                Spune-le prietenilor username-ul tău — <b>{player.username}</b> — sau caută-i în stânga. Le vei vedea nivelul pe hartă și scorurile la fiecare nivel.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <button
                  key={f.username}
                  onClick={() => {
                    play("tap");
                    onOpenFriend(f);
                  }}
                  className="panel flex w-full items-center gap-3 rounded-[18px]! p-2.5 text-left active:scale-[0.98]"
                >
                  <Avatar emoji={f.avatar} ring="ring-[#4cb4ff]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold">{f.username}</div>
                    <div className="text-[12px] text-ink-soft">{timeAgo(f.lastSeen)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold">Nivelul {f.level}</div>
                    <div className="flex items-center justify-end gap-1 text-[13px] font-semibold text-ink-soft">
                      <StarShape filled className="h-4 w-4" /> {formatNumber(f.totalStars)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
