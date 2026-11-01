"use client";

import { motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { AVATARS, normalizeUsername, USERNAME_RULES } from "@/lib/shared";
import { play, unlockAudio } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { Gem, GemDefs } from "./art/Pieces";
import { InstallButton } from "./OrientationGate";

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-end ${small ? "gap-1" : "gap-1.5"}`}>
        {[0, 2, 1, 4, 3].map((c, i) => (
          <motion.div
            key={c}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 300, damping: 14 }}
            className={i === 2 ? (small ? "h-12 w-12" : "h-16 w-16") : small ? "h-9 w-9" : "h-12 w-12"}
          >
            <div className="float-bob h-full w-full" style={{ animationDelay: `${i * 0.25}s` }}>
              <Gem color={c} className="h-full w-full" />
            </div>
          </motion.div>
        ))}
      </div>
      <h1 className={`title-stroke mt-2 text-center font-bold leading-none ${small ? "text-[34px]" : "text-[48px]"}`}>Djesi Jewels</h1>
    </div>
  );
}

export function Onboarding() {
  const setSession = useGame((s) => s.setSession);
  const toast = useGame((s) => s.toast);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const valid = !!normalizeUsername(name);

  async function enter() {
    unlockAudio();
    if (!valid) return toast(USERNAME_RULES, "error");
    setBusy(true);
    try {
      const r = await api.session(name, avatar);
      play("win");
      setSession(r.player, r.results);
      toast(r.created ? `Bun venit, ${r.player.username}!` : `Bine ai revenit, ${r.player.username}!`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_0%,#9b6bff_0%,#4b2398_45%,#1b1035_100%)]">
      <GemDefs />
      <div className="mx-auto flex min-h-full max-w-[900px] items-center gap-6 py-3 pl-[max(env(safe-area-inset-left),20px)] pr-[max(env(safe-area-inset-right),20px)]">
        <div className="flex flex-1 flex-col items-center">
          <Logo />
          <p className="mt-3 max-w-[340px] text-center text-[16px] font-medium text-white/85">
            Potrivește piese, sparge obstacole, urcă nivel după nivel — la infinit.
          </p>
          <InstallButton className="mt-4 h-11 px-5 text-[16px]" />
        </div>

        <motion.form
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="panel w-[400px] shrink-0 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void enter();
          }}
        >
          <label htmlFor="username" className="block text-[17px] font-bold">
            Cum te numești?
          </label>
          <input
            id="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            autoComplete="nickname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="ex: Djesi"
            className="mt-1.5 h-12 w-full rounded-2xl border-[3px] border-[#f1d7a5] bg-white px-4 text-[18px] font-semibold text-ink outline-none placeholder:text-[#c9b9a0] focus:border-[#b48cff]"
          />
          <p className="mt-1.5 text-[12px] text-ink-soft">{USERNAME_RULES}. Dacă numele există deja, continui jocul acelui jucător.</p>

          <div className="mt-3 text-[15px] font-bold">Alege un avatar</div>
          <div className="mt-2 grid grid-cols-8 gap-1.5">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => {
                  unlockAudio();
                  play("tap");
                  setAvatar(a);
                }}
                className={`flex aspect-square items-center justify-center rounded-xl text-[24px] transition ${
                  avatar === a ? "scale-110 bg-[#ffd23f] shadow-[0_3px_0_#c98a2b]" : "bg-white/70"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <button type="submit" disabled={busy} className="btn btn-green shine mt-4 h-13 w-full text-[20px]">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
            Începe aventura
          </button>
        </motion.form>
      </div>
    </div>
  );
}
