"use client";

import { getAudio, onAudioUnlocked } from "./sound";

/**
 * Generative background music: a soft pad, a plucked arpeggio and a sparse bell melody,
 * all scheduled a little ahead of time on the shared AudioContext. No files needed.
 */

const BPM = 92;
const BEAT = 60 / BPM;
/** I – V – vi – IV in C major, one bar (4 beats) each, as frequencies. */
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0],
  [196.0, 246.94, 293.66],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
];
const MELODY = [0, 2, 1, -1, 2, 0, -1, 1, 0, -1, 2, 1, -1, 0, 1, -1];

let wanted = false;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBeat = 0;
let beatIndex = 0;
let bus: GainNode | null = null;

function pad(ctx: AudioContext, out: AudioNode, freqs: number[], t: number, dur: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.9);
  g.gain.setValueAtTime(0.09, t + dur - 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  filter.connect(g).connect(out);
  for (const f of freqs) {
    for (const detune of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
}

function pluck(ctx: AudioContext, out: AudioNode, freq: number, t: number, vol = 0.11) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(freq * 2, t);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(out);
  o2.connect(g2).connect(out);
  o.start(t);
  o.stop(t + 0.55);
  o2.start(t);
  o2.stop(t + 0.3);
}

function schedule(ctx: AudioContext, out: AudioNode, beat: number, t: number) {
  const bar = Math.floor(beat / 4) % CHORDS.length;
  const inBar = beat % 4;
  const chord = CHORDS[bar];
  if (inBar === 0) pad(ctx, out, chord, t, BEAT * 4);
  // arpeggio: two plucks per beat, climbing through the chord an octave up
  const tones = [chord[0] * 2, chord[1] * 2, chord[2] * 2, chord[1] * 4];
  pluck(ctx, out, tones[inBar % tones.length], t, 0.08);
  pluck(ctx, out, tones[(inBar + 2) % tones.length], t + BEAT / 2, 0.06);
  // sparse bell melody every other beat
  const m = MELODY[beat % MELODY.length];
  if (m >= 0 && inBar % 2 === 0) pluck(ctx, out, chord[m] * 4, t + BEAT / 4, 0.07);
}

function tick() {
  const audio = getAudio();
  if (!audio || !bus) return;
  const { ctx } = audio;
  if (ctx.state !== "running") return;
  if (nextBeat === 0) nextBeat = ctx.currentTime + 0.1;
  while (nextBeat < ctx.currentTime + 0.4) {
    schedule(ctx, bus, beatIndex, nextBeat);
    beatIndex++;
    nextBeat += BEAT;
  }
}

/** Fade the music in; it starts for real once the audio context is unlocked. */
export function startMusic() {
  wanted = true;
  if (timer) return;
  const audio = getAudio();
  if (!audio) return;
  if (!bus) {
    bus = audio.ctx.createGain();
    bus.gain.value = 0;
    bus.connect(audio.master);
  }
  bus.gain.cancelScheduledValues(audio.ctx.currentTime);
  bus.gain.setTargetAtTime(0.55, audio.ctx.currentTime, 0.8);
  nextBeat = 0;
  timer = setInterval(tick, 120);
}

export function stopMusic() {
  wanted = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const audio = getAudio();
  if (audio && bus) bus.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4);
}

/** Called after the context unlocks: start if the player asked for music before that. */
export function resumeMusicIfWanted() {
  if (wanted && !timer) startMusic();
}

onAudioUnlocked(resumeMusicIfWanted);

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    } else if (wanted) startMusic();
  });
}
