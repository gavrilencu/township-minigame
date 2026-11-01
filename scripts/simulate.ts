/* Greedy bot used to sanity-check the engine and calibrate level move counts.
 * Run: npx tsx scripts/simulate.ts [fromLevel] [toLevel] [runsPerLevel] */
import { Engine } from "../src/lib/game/engine";
import { coreMoves, generateLevel } from "../src/lib/game/levels";
import type { Pos } from "../src/lib/game/types";

function progress(e: Engine): number {
  return e.goals.reduce((s, g) => s + (g.target - g.remaining) * (g.kind === "color" ? 1 : 1.3), 0);
}

function checkInvariants(e: Engine, where: string) {
  const ids = new Set<number>();
  for (let r = 0; r < e.rows; r++) {
    for (let c = 0; c < e.cols; c++) {
      const cell = e.cells[r][c];
      if (!cell.exists && (cell.tile || cell.blocker)) throw new Error(`${where}: content in hole ${r},${c}`);
      if (cell.blocker && cell.tile) throw new Error(`${where}: tile on blocker ${r},${c}`);
      if (cell.lock && !cell.tile) throw new Error(`${where}: chain without a tile ${r},${c}`);
      if (cell.tile) {
        if (ids.has(cell.tile.id)) throw new Error(`${where}: duplicate tile id ${cell.tile.id}`);
        ids.add(cell.tile.id);
      }
    }
  }
}

function candidates(e: Engine): { kind: "swap" | "tap"; a: Pos; b?: Pos }[] {
  const out: { kind: "swap" | "tap"; a: Pos; b?: Pos }[] = [];
  for (let r = 0; r < e.rows; r++) {
    for (let c = 0; c < e.cols; c++) {
      const a = { r, c };
      if (!e.isMovable(a)) continue;
      if (e.tileAt(a)!.special) out.push({ kind: "tap", a });
      for (const b of [
        { r, c: c + 1 },
        { r: r + 1, c },
      ]) {
        if (e.isMovable(b)) out.push({ kind: "swap", a, b });
      }
    }
  }
  return out;
}

const mode = process.argv[5] ?? "greedy";
if (process.env.SPAWN_ASSIST) Engine.SPAWN_ASSIST = Number(process.env.SPAWN_ASSIST);
let totalPops = 0;
let totalMoves = 0;

function playOnce(level: number, maxMoves = 150) {
  const cfg = generateLevel(level);
  const e = new Engine({ ...cfg, moves: maxMoves });
  checkInvariants(e, `L${level} init`);
  let used = 0;
  while (!e.isWon() && e.movesLeft > 0) {
    let best: { score: number; cand: ReturnType<typeof candidates>[number] } | null = null;
    for (const cand of candidates(e)) {
      const sim = e.clone();
      let ok = false;
      if (cand.kind === "tap") ok = !!sim.activateAt(cand.a);
      else ok = !!sim.trySwap(cand.a, cand.b!)?.valid;
      if (!ok) continue;
      const s = mode === "random" ? Math.random() : progress(sim) * 100 + sim.score * 0.001 + Math.random();
      if (!best || s > best.score) best = { score: s, cand };
    }
    if (!best) throw new Error(`L${level}: no valid move found (hint says ${JSON.stringify(e.findHint())})`);
    // Re-play the chosen move on the real engine so cascades get fresh randomness.
    const frames =
      best.cand.kind === "tap" ? e.activateAt(best.cand.a)! : e.trySwap(best.cand.a, best.cand.b!)!.frames;
    totalPops += frames.reduce((n, f) => n + f.effects.filter((x) => x.type === "pop").length, 0);
    totalMoves++;
    used++;
    checkInvariants(e, `L${level} move ${used}`);
  }
  return { won: e.isWon(), used, cfg };
}

const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? 40);
const runs = Number(process.argv[4] ?? 4);
let tooTight = 0;
for (let lv = from; lv <= to; lv++) {
  const results: number[] = [];
  let cfg = generateLevel(lv);
  for (let i = 0; i < runs; i++) {
    const res = playOnce(lv);
    cfg = res.cfg;
    results.push(res.won ? res.used : 999);
  }
  results.sort((a, b) => a - b);
  const median = results[Math.floor(results.length / 2)];
  const winRate = results.filter((u) => u <= cfg.moves).length / results.length;
  if (winRate < 0.5) tooTight++;
  const goals = cfg.goals.map((g) => `${g.kind}${g.color ?? g.special ?? ""}:${g.target}`).join(" ");
  const core = coreMoves({ n: lv, rows: cfg.rows, colors: cfg.colors, goals: cfg.goals, blockers: cfg.blockers, ice: cfg.ice, locks: cfg.locks, difficulty: cfg.difficulty });
  const hp = (k: string) => cfg.blockers.filter((b) => b.kind === k).reduce((s, b) => s + b.hp, 0);
  const iceHp = cfg.ice.reduce((s, i) => s + i.hp, 0);
  const colorAmts = cfg.goals.filter((g) => g.kind === "color").map((g) => g.target).sort((a, b) => b - a);
  if (process.env.CSV) {
    const grass = cfg.goals.find((g) => g.kind === "grass")?.target ?? 0;
    const special = cfg.goals.filter((g) => g.kind === "special").map((g) => `${g.special}:${g.target}`).join(";");
    console.error(
      [lv, cfg.colors, median, results.join("|"), colorAmts[0] ?? 0, colorAmts.slice(1).reduce((a, b) => a + b, 0), hp("crate"), hp("cloud"), iceHp, cfg.locks.length, grass, special, cfg.rows].join(","),
    );
  }

  console.log(
    `L${String(lv).padStart(3)} ${cfg.difficulty.padEnd(6)} c${cfg.colors} moves=${String(cfg.moves).padStart(2)} core=${core.toFixed(1).padStart(5)} botMedian=${String(median).padStart(3)} win=${(winRate * 100).toFixed(0).padStart(3)}%  ${goals}`,
  );
}
console.log(`levels with bot win-rate < 50%: ${tooTight}; gems cleared per move: ${(totalPops / totalMoves).toFixed(2)}`);
