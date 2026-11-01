"use client";

import type { SoundName } from "./game/types";

export type Sfx = SoundName | "win" | "lose" | "coin" | "tap" | "star" | "pop";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
const unlockListeners: (() => void)[] = [];

/**
 * Optional real recordings: drop files in `public/sfx/` and list them in `public/sfx/index.json`
 * as `{ "match": "match.mp3", "bomb": "bomb.mp3", ... }`. Anything missing keeps the synth sound.
 */
const samples = new Map<string, AudioBuffer>();
let samplesLoaded = false;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

/** The shared context and master gain, once a gesture has unlocked audio. */
export function getAudio(): { ctx: AudioContext; master: GainNode } | null {
  return ctx && master ? { ctx, master } : null;
}

/** Run once audio can play (music waits for this). */
export function onAudioUnlocked(fn: () => void) {
  unlockListeners.push(fn);
}

async function loadSamples(ac: AudioContext) {
  if (samplesLoaded) return;
  samplesLoaded = true;
  try {
    const res = await fetch("/sfx/index.json", { cache: "force-cache" });
    if (!res.ok) return;
    const index = (await res.json()) as Record<string, string>;
    await Promise.all(
      Object.entries(index).map(async ([name, file]) => {
        try {
          const r = await fetch(`/sfx/${file}`, { cache: "force-cache" });
          if (!r.ok) return;
          samples.set(name, await ac.decodeAudioData(await r.arrayBuffer()));
        } catch {}
      }),
    );
  } catch {}
}

/** iOS only allows audio after a user gesture: call this from the first tap. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    void loadSamples(ctx);
  }
  if (ctx.state === "suspended") void ctx.resume();
  for (const fn of unlockListeners) fn();
}

/* ---------- synth building blocks ---------- */

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.4, to?: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number, type: BiquadFilterType = "lowpass", to?: number, delay = 0, q = 1) {
  if (!ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** A resonant "body": noise through a narrow band-pass, like striking a material. */
function body(freq: number, dur: number, vol: number, delay = 0) {
  noise(dur, vol, freq, "bandpass", undefined, delay, 12);
}

function sample(name: string, rate = 1, vol = 1): boolean {
  const buf = samples.get(name);
  if (!buf || !ctx || !master) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(master);
  src.start();
  return true;
}

const semis = (n: number) => Math.pow(2, n / 12);

export function play(name: Sfx, cascade = 0) {
  if (!enabled || !ctx) return;
  const lift = semis(Math.min(cascade, 10) * 2);
  if (sample(name, name === "match" || name === "pop" ? lift : 1)) return;
  switch (name) {
    case "swap":
      tone(520, 0.09, "sine", 0.2, 760);
      noise(0.06, 0.08, 2500, "highpass");
      break;
    case "invalid":
      tone(240, 0.16, "triangle", 0.25, 150);
      tone(180, 0.18, "sine", 0.15, 120, 0.05);
      break;
    case "match":
    case "pop": {
      // jelly pop: a pitch drop, a click and a bright partial
      const f = 640 * lift;
      tone(f * 1.4, 0.11, "sine", 0.32, f * 0.7);
      tone(f * 2, 0.07, "triangle", 0.1, undefined, 0.01);
      noise(0.025, 0.25, 3500, "highpass");
      break;
    }
    case "create":
      [0, 4, 7, 12].forEach((s, i) => tone(700 * semis(s), 0.14, "sine", 0.2, undefined, i * 0.045));
      noise(0.3, 0.12, 5000, "highpass", 9000);
      break;
    case "rocket":
      noise(0.42, 0.4, 500, "bandpass", 4200, 0, 2);
      tone(220, 0.36, "sawtooth", 0.05, 1200);
      noise(0.12, 0.25, 180, "lowpass");
      break;
    case "bomb":
      tone(110, 0.5, "sine", 0.6, 32);
      noise(0.5, 0.9, 2200, "lowpass", 90);
      [0.06, 0.11, 0.17, 0.25].forEach((d, i) => noise(0.05, 0.3 - i * 0.05, 900 + i * 300, "bandpass", undefined, d, 3));
      break;
    case "plane":
      tone(880, 0.32, "sine", 0.14, 1600);
      noise(0.3, 0.14, 2500, "highpass", 6000);
      break;
    case "rainbow":
      [0, 3, 7, 12, 15, 19, 24].forEach((s, i) => tone(660 * semis(s), 0.18, "sine", 0.16, undefined, i * 0.04));
      noise(0.45, 0.1, 4000, "highpass", 9000);
      break;
    case "crate":
      // wood: a dull knock with a short resonance and splinters
      noise(0.09, 0.6, 420, "lowpass");
      body(300, 0.14, 0.5);
      tone(190, 0.12, "triangle", 0.12, 100);
      noise(0.08, 0.15, 3000, "highpass", undefined, 0.03);
      break;
    case "cloud":
      noise(0.22, 0.35, 1600, "lowpass", 300);
      tone(520, 0.2, "sine", 0.06, 380);
      break;
    case "ice":
      // glass: two bright partials and a shard tinkle
      tone(2400, 0.14, "sine", 0.14, 2600);
      tone(3600, 0.1, "sine", 0.07, undefined, 0.01);
      body(4200, 0.18, 0.35);
      noise(0.12, 0.2, 6000, "highpass", undefined, 0.02);
      break;
    case "shuffle":
      for (let i = 0; i < 6; i++) tone(500 + i * 90, 0.05, "sine", 0.14, undefined, i * 0.06);
      noise(0.4, 0.08, 1500, "bandpass", 3000, 0, 1);
      break;
    case "hammer":
      noise(0.14, 0.6, 900, "lowpass");
      body(240, 0.16, 0.5);
      tone(160, 0.18, "sine", 0.4, 55);
      break;
    case "win":
      [0, 4, 7, 12].forEach((s, i) => tone(523 * semis(s), i === 3 ? 0.5 : 0.18, "triangle", 0.3, undefined, i * 0.13));
      [0, 4, 7, 12].forEach((s, i) => tone(1046 * semis(s), 0.12, "sine", 0.08, undefined, i * 0.13 + 0.02));
      break;
    case "lose":
      [7, 4, 0].forEach((s, i) => tone(392 * semis(s - 7), 0.28, "triangle", 0.25, undefined, i * 0.18));
      break;
    case "coin":
      tone(1320, 0.08, "square", 0.07);
      tone(1760, 0.18, "square", 0.07, undefined, 0.07);
      tone(2640, 0.12, "sine", 0.05, undefined, 0.08);
      break;
    case "star":
      tone(880, 0.25, "sine", 0.25, 1320);
      tone(1760, 0.22, "sine", 0.1, undefined, 0.05);
      noise(0.25, 0.08, 6000, "highpass");
      break;
    case "tap":
      tone(900, 0.04, "sine", 0.12);
      break;
  }
}
