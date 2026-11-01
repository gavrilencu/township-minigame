"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { registerServiceWorker } from "@/lib/pwa";
import type { PreBooster } from "@/lib/game/economy";
import type { FriendDTO } from "@/lib/shared";
import { startMusic, stopMusic } from "@/lib/music";
import { setSoundEnabled, unlockAudio } from "@/lib/sound";
import { useGame, USERNAME_KEY } from "@/lib/store";
import { GemDefs } from "./art/Pieces";
import { GameScreen } from "./game/GameScreen";
import { MapScreen } from "./map/MapScreen";
import { DailyModal, FriendModal, LevelStartModal, ProfileModal } from "./Modals";
import { Logo, Onboarding } from "./Onboarding";
import { FriendsScreen } from "./screens/FriendsScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { enterFullscreen, OrientationGate } from "./OrientationGate";
import { RAIL, Resources, SideRail, type Tab } from "./Shell";
import { Toaster } from "./ui";

type Boot = { state: "loading" } | { state: "ready" } | { state: "error"; message: string };
type Restored = { boot: Boot; session?: Awaited<ReturnType<typeof api.session>> };

/** Logs back in with the username remembered on this device, if any. */
async function restoreSession(): Promise<Restored> {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(USERNAME_KEY);
  } catch {}
  if (!saved) return { boot: { state: "ready" } };
  try {
    return { boot: { state: "ready" }, session: await api.session(saved) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      localStorage.removeItem(USERNAME_KEY);
      return { boot: { state: "ready" } };
    }
    return { boot: { state: "error", message: (e as Error).message } };
  }
}

const TAB_ORDER: Tab[] = ["map", "shop", "friends", "ranks"];

export default function App() {
  const player = useGame((s) => s.player);
  const sound = useGame((s) => s.sound);
  const music = useGame((s) => s.music);
  const setSession = useGame((s) => s.setSession);
  const setFriends = useGame((s) => s.setFriends);
  const [boot, setBoot] = useState<Boot>({ state: "loading" });
  const [tab, setTab] = useState<Tab>("map");
  const [prevTab, setPrevTab] = useState<Tab>("map");
  const [startLevel, setStartLevel] = useState<number | null>(null);
  const [playing, setPlaying] = useState<{ level: number; pre: PreBooster[]; key: number } | null>(null);
  const [profile, setProfile] = useState(false);
  const [daily, setDaily] = useState(false);
  const [friend, setFriend] = useState<FriendDTO | null>(null);

  const apply = useCallback(
    (r: Restored) => {
      if (r.session) setSession(r.session.player, r.session.results);
      setBoot(r.boot);
    },
    [setSession],
  );

  useEffect(() => {
    let live = true;
    void restoreSession().then((r) => live && apply(r));
    return () => {
      live = false;
    };
  }, [apply]);

  const retry = () => {
    setBoot({ state: "loading" });
    void restoreSession().then(apply);
  };

  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(registerServiceWorker, []);

  // Background music follows the setting and only plays for a signed-in player.
  useEffect(() => {
    if (music && player) startMusic();
    else stopMusic();
  }, [music, !!player]); // eslint-disable-line react-hooks/exhaustive-deps

  const username = player?.username;
  useEffect(() => {
    if (!username) return;
    api
      .friends(username)
      .then((r) => setFriends(r.friends))
      .catch(() => {});
  }, [username, setFriends, playing]);

  // iOS only starts Web Audio from a real gesture; any of these counts, and unlocking twice is harmless.
  // The same gesture asks for full screen + landscape lock where the browser supports it.
  useEffect(() => {
    const events = ["pointerdown", "touchend", "click"] as const;
    const onGesture = () => {
      unlockAudio();
      void enterFullscreen();
    };
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onGesture));
  }, []);

  const switchTab = (t: Tab) => {
    setPrevTab(tab);
    setTab(t);
  };
  // tabs slide from the side they sit on in the rail
  const dir = TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(prevTab) ? 1 : -1;

  return (
    <>
      {renderScreen()}
      <OrientationGate />
      <Toaster />
    </>
  );

  function renderScreen() {
    if (boot.state !== "ready") {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[radial-gradient(120%_80%_at_50%_0%,#9b6bff_0%,#4b2398_45%,#1b1035_100%)] px-6">
          <GemDefs />
          <Logo />
          {boot.state === "loading" ? (
            <Loader2 className="mt-6 h-9 w-9 animate-spin text-white/80" />
          ) : (
            <div className="mt-6 text-center">
              <p className="text-[16px] font-semibold text-white">{boot.message}</p>
              <button onClick={retry} className="btn btn-gold mt-4 h-12 px-6 text-[17px]">
                <RotateCcw className="h-5 w-5" /> Încearcă din nou
              </button>
            </div>
          )}
        </div>
      );
    }

    if (!player) return <Onboarding />;

    return (
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <motion.div
            key={`game-${playing.key}`}
            className="fixed inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <GameScreen
              level={playing.level}
              pre={playing.pre}
              onExit={(next) => {
                setPlaying(null);
                setTab("map");
                if (next && next <= (useGame.getState().player?.level ?? 1)) setStartLevel(next);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="hub"
            className="fixed inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#7b4fd6_0%,#3a1f78_50%,#1b1035_100%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GemDefs />
            <div className="absolute inset-y-0 right-0" style={{ left: `calc(env(safe-area-inset-left) + ${RAIL}px)` }}>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={tab}
                  custom={dir}
                  className="absolute inset-0"
                  variants={{
                    enter: (d: number) => ({ opacity: 0, y: 18 * d }),
                    center: { opacity: 1, y: 0 },
                    exit: (d: number) => ({ opacity: 0, y: -14 * d }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {tab === "map" && <MapScreen onOpenLevel={setStartLevel} onDaily={() => setDaily(true)} />}
                  {tab === "shop" && <ShopScreen onDaily={() => setDaily(true)} />}
                  {tab === "friends" && <FriendsScreen onOpenFriend={setFriend} />}
                  {tab === "ranks" && <LeaderboardScreen />}
                </motion.div>
              </AnimatePresence>
            </div>
            <SideRail tab={tab} onTab={switchTab} onProfile={() => setProfile(true)} />
            <Resources onShop={() => switchTab("shop")} />

            <LevelStartModal
              level={startLevel}
              onClose={() => setStartLevel(null)}
              onPlay={(level, pre) => {
                setStartLevel(null);
                setPlaying({ level, pre, key: Date.now() });
              }}
            />
            <ProfileModal open={profile} onClose={() => setProfile(false)} />
            <DailyModal open={daily} onClose={() => setDaily(false)} />
            <FriendModal friend={friend} onClose={() => setFriend(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
}
