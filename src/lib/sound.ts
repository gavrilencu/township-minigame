"use client";

import type { SoundName } from "./game/types";

export type Sfx = SoundName | "win" | "lose" | "coin" | "tap" | "star" | "pop";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
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
  }
  if (ctx.state === "suspended") void ctx.resume();
}

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

function noise(dur: number, vol: number, freq: number, type: BiquadFilterType = "lowpass", to?: number, delay = 0) {
  if (!ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const semis = (n: number) => Math.pow(2, n / 12);

export function play(name: Sfx, cascade = 0) {
  if (!enabled || !ctx) return;
  switch (name) {
    case "swap":
      tone(520, 0.09, "sine", 0.22, 760);
      break;
    case "invalid":
      tone(240, 0.16, "triangle", 0.25, 150);
      break;
    case "match":
    case "pop": {
      const f = 620 * semis(Math.min(cascade, 10) * 2);
      tone(f, 0.13, "triangle", 0.3);
      tone(f * 2, 0.09, "sine", 0.12, undefined, 0.02);
      break;
    }
    case "create":
      [0, 4, 7].forEach((s, i) => tone(700 * semis(s), 0.1, "sine", 0.22, undefined, i * 0.05));
      break;
    case "rocket":
      noise(0.38, 0.35, 700, "bandpass", 3200);
      tone(280, 0.3, "sawtooth", 0.06, 900);
      break;
    case "bomb":
      noise(0.55, 0.8, 1100, "lowpass", 90);
      tone(130, 0.45, "sine", 0.5, 38);
      break;
    case "plane":
      tone(880, 0.3, "sine", 0.16, 1500);
      noise(0.25, 0.12, 3000, "highpass");
      break;
    case "rainbow":
      [0, 3, 7, 12, 15, 19].forEach((s, i) => tone(660 * semis(s), 0.16, "sine", 0.18, undefined, i * 0.045));
      break;
    case "crate":
      noise(0.12, 0.5, 500, "bandpass");
      tone(170, 0.1, "square", 0.08, 110);
      break;
    case "cloud":
      noise(0.18, 0.35, 1600, "lowpass", 400);
      break;
    case "ice":
      tone(1900, 0.1, "triangle", 0.12, 2600);
      noise(0.1, 0.18, 5000, "highpass");
      break;
    case "shuffle":
      for (let i = 0; i < 6; i++) tone(500 + i * 90, 0.05, "sine", 0.14, undefined, i * 0.06);
      break;
    case "hammer":
      noise(0.14, 0.6, 900, "lowpass");
      tone(160, 0.18, "sine", 0.4, 55);
      break;
    case "win":
      [0, 4, 7, 12].forEach((s, i) => tone(523 * semis(s), i === 3 ? 0.5 : 0.18, "triangle", 0.3, undefined, i * 0.13));
      break;
    case "lose":
      [7, 4, 0].forEach((s, i) => tone(392 * semis(s - 7), 0.28, "triangle", 0.25, undefined, i * 0.18));
      break;
    case "coin":
      tone(1320, 0.08, "square", 0.08);
      tone(1760, 0.18, "square", 0.08, undefined, 0.07);
      break;
    case "star":
      tone(880, 0.25, "sine", 0.25, 1320);
      tone(1760, 0.2, "sine", 0.1, undefined, 0.05);
      break;
    case "tap":
      tone(900, 0.04, "sine", 0.12);
      break;
  }
}
