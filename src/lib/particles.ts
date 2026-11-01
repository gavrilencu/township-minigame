"use client";

/**
 * Debris on a single canvas. Hundreds of DOM elements with their own animations are what made
 * bombs stutter on slow phones; one canvas redraw per frame costs a fraction of that.
 */

export type DebrisKind = "gem" | "crate" | "cloud" | "ice" | "lock";

type Shape = "shard" | "plank" | "link" | "spark" | "puff" | "glow" | "ring" | "blast";

interface Particle {
  shape: Shape;
  x: number;
  y: number;
  /** velocity (px/s) for physics shapes; target offset for interpolated ones */
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  light: string;
  /** seconds to wait before the particle appears */
  delay: number;
  age: number;
  life: number;
  /** gravity (px/s²) for physics shapes */
  g: number;
  poly: number;
}

const MAX = 700;
const POLYS: [number, number][][] = [
  [
    [0, -0.5],
    [0.5, 0.15],
    [-0.25, 0.5],
  ],
  [
    [-0.5, -0.3],
    [0.3, -0.5],
    [0.5, 0.25],
    [-0.2, 0.5],
  ],
  [
    [-0.3, -0.5],
    [0.5, -0.2],
    [0.1, 0.5],
    [-0.5, 0.2],
  ],
];

const rnd = (seed: number, i: number, m: number) => ((seed * 31 + i * 17) % m) / m;

export class ParticleSystem {
  private ps: Particle[] = [];
  private raf = 0;
  private last = 0;
  private ctx: CanvasRenderingContext2D | null;
  private dpr = 1;
  /** the canvas is offset by this much from the board origin, so debris can leave the board */
  private pad = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  resize(w: number, h: number, pad: number) {
    this.pad = pad;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round((w + pad * 2) * this.dpr);
    this.canvas.height = Math.round((h + pad * 2) * this.dpr);
    this.canvas.style.width = `${w + pad * 2}px`;
    this.canvas.style.height = `${h + pad * 2}px`;
  }

  get count() {
    return this.ps.length;
  }

  private add(p: Particle) {
    if (this.ps.length >= MAX) return;
    this.ps.push(p);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** A piece or obstacle breaking at (x, y). `rich` adds sparkles and more debris. */
  burst(x: number, y: number, kind: DebrisKind, colors: string[], S: number, seed: number, delay: number, rich: boolean) {
    const room = Math.max(0.25, 1 - this.ps.length / MAX);
    const base = kind === "cloud" ? 6 : kind === "crate" ? 6 : rich ? 9 : 5;
    const count = Math.max(2, Math.round(base * room));
    // impact glow
    this.add({ shape: "glow", x, y, vx: 0, vy: 0, size: S * 0.75, rot: 0, vr: 0, color: "#fff", light: "#fff", delay, age: 0, life: 0.3, g: 0, poly: 0 });
    if (kind === "gem" && rich) {
      this.add({ shape: "ring", x, y, vx: 0, vy: 0, size: S * 0.6, rot: 0, vr: 0, color: colors[1], light: colors[1], delay, age: 0, life: 0.5, g: 0, poly: 0 });
    }
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + rnd(seed, i, 10) * 0.8;
      const reach = S * (kind === "cloud" ? 0.45 : 0.55 + rnd(seed, i, 7) * 0.5);
      const color = colors[i % colors.length];
      if (kind === "cloud") {
        this.add({ shape: "puff", x, y, vx: Math.cos(ang) * reach, vy: Math.sin(ang) * reach - S * 0.2, size: S * (0.32 + rnd(seed, i, 4) * 0.2), rot: 0, vr: 0, color, light: color, delay, age: 0, life: 0.7, g: 0, poly: 0 });
        continue;
      }
      const speed = 3.2;
      const p: Particle = {
        shape: kind === "crate" ? "plank" : kind === "lock" ? "link" : "shard",
        x,
        y,
        vx: Math.cos(ang) * reach * speed,
        vy: (Math.sin(ang) * reach - S * 0.4) * speed,
        size: kind === "crate" ? S * 0.4 : kind === "lock" ? S * 0.2 : S * (0.16 + rnd(seed, i, 6) * 0.14),
        rot: rnd(seed, i, 5) * Math.PI,
        vr: (i % 2 ? 1 : -1) * (4 + rnd(seed, i, 9) * 6),
        color,
        light: colors[(i + 1) % colors.length],
        delay,
        age: 0,
        life: 0.8,
        g: S * 11,
        poly: i % POLYS.length,
      };
      this.add(p);
    }
    if (rich && kind !== "cloud") {
      for (let i = 0; i < 3; i++) {
        const ang = rnd(seed, i + 20, 13) * Math.PI * 2;
        this.add({ shape: "spark", x, y, vx: Math.cos(ang) * S * 0.8, vy: Math.sin(ang) * S * 0.8, size: S * (0.18 + rnd(seed, i, 3) * 0.1), rot: 0, vr: 0, color: i % 2 ? "#fff6b3" : "#ffffff", light: "#fff", delay: delay + i * 0.05, age: 0, life: 0.55, g: 0, poly: 0 });
      }
    }
  }

  /** The big orange flash of a bomb; `size` is its full diameter. */
  blast(x: number, y: number, size: number) {
    this.add({ shape: "blast", x, y, vx: 0, vy: 0, size: size / 2, rot: 0, vr: 0, color: "#ff922b", light: "#fff", delay: 0, age: 0, life: 0.5, g: 0, poly: 0 });
    this.add({ shape: "ring", x, y, vx: 0, vy: 0, size: size * 0.45, rot: 0, vr: 0, color: "#fff", light: "#fff", delay: 0.05, age: 0, life: 0.55, g: 0, poly: 0 });
  }

  /** A white ring and glow: new special, hammer hit. */
  ring(x: number, y: number, size: number) {
    this.add({ shape: "ring", x, y, vx: 0, vy: 0, size: size / 2, rot: 0, vr: 0, color: "#fff", light: "#fff", delay: 0, age: 0, life: 0.55, g: 0, poly: 0 });
    this.add({ shape: "glow", x, y, vx: 0, vy: 0, size: size / 2, rot: 0, vr: 0, color: "#fff", light: "#fff", delay: 0, age: 0, life: 0.34, g: 0, poly: 0 });
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ps = [];
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private tick = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const ctx = this.ctx;
    if (!ctx) return;
    const { pad, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    const live: Particle[] = [];
    for (const p of this.ps) {
      if (p.delay > 0) {
        p.delay -= dt;
        live.push(p);
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) continue;
      const k = p.age / p.life;
      if (p.shape === "shard" || p.shape === "plank" || p.shape === "link") {
        p.vx *= 1 - 1.6 * dt;
        p.vy = (p.vy + p.g * dt) * (1 - 0.6 * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      this.draw(ctx, p, k, pad);
      live.push(p);
    }
    this.ps = live;
    if (live.length) this.raf = requestAnimationFrame(this.tick);
    else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    }
  };

  private draw(ctx: CanvasRenderingContext2D, p: Particle, k: number, pad: number) {
    const x = p.x + pad;
    const y = p.y + pad;
    switch (p.shape) {
      case "shard":
      case "plank":
      case "link": {
        const alpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
        const s = p.size * (1 - k * 0.35);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        if (p.shape === "plank") {
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s * 0.16, s, s * 0.32);
          ctx.fillStyle = "rgba(92,51,23,0.45)";
          ctx.fillRect(-s / 2, s * 0.04, s, s * 0.12);
        } else if (p.shape === "link") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(2, s * 0.25);
          ctx.beginPath();
          ctx.ellipse(0, 0, s / 2, s * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const poly = POLYS[p.poly];
          ctx.fillStyle = p.color;
          ctx.beginPath();
          poly.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)));
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = p.light;
          ctx.globalAlpha = alpha * 0.55;
          ctx.beginPath();
          poly.forEach(([px, py], i) => (i ? ctx.lineTo(px * s * 0.5 - s * 0.1, py * s * 0.5 - s * 0.1) : ctx.moveTo(px * s * 0.5 - s * 0.1, py * s * 0.5 - s * 0.1)));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        return;
      }
      case "spark": {
        const e = k < 0.55 ? k / 0.55 : 1;
        const scale = k < 0.15 ? k / 0.15 : k < 0.55 ? 1 + ((k - 0.15) / 0.4) * 0.3 : 1.3 * (1 - (k - 0.55) / 0.45);
        const sx = x + p.vx * (k < 0.55 ? e * 0.8 : 0.8 + ((k - 0.55) / 0.45) * 0.2);
        const sy = y + p.vy * (k < 0.55 ? e * 0.8 : 0.8 + ((k - 0.55) / 0.45) * 0.2);
        const s = p.size * scale;
        ctx.save();
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
        ctx.translate(sx, sy);
        ctx.rotate(k * Math.PI);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? s * 0.16 : s * 0.5;
          const a = (i * Math.PI) / 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }
      case "puff": {
        const s = p.size * (0.4 + 1.3 * k);
        ctx.save();
        ctx.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.95;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x + p.vx * k, y + p.vy * k - 10 * k, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      case "glow": {
        const r = p.size * (0.3 + 1.1 * k);
        ctx.save();
        ctx.globalAlpha = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,255,255,0.95)");
        grad.addColorStop(0.4, "rgba(255,255,255,0.4)");
        grad.addColorStop(0.7, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      case "blast": {
        const r = p.size * (0.15 + 0.95 * k);
        ctx.save();
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.25, "rgba(255,236,153,0.95)");
        grad.addColorStop(0.5, "rgba(255,146,43,0.75)");
        grad.addColorStop(0.72, "rgba(255,80,40,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      case "ring": {
        const r = p.size * (0.2 + 1.05 * k);
        ctx.save();
        ctx.globalAlpha = (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9) * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 - 3 * k;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }
    }
  }
}
