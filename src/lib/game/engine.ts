import type {
  BlockerKind,
  Cell,
  Effect,
  Frame,
  FrameKind,
  Goal,
  GoalKind,
  LevelConfig,
  Pos,
  SoundName,
  SpecialKind,
  Tile,
} from "./types";

type Activation = {
  r: number;
  c: number;
  kind: SpecialKind | "planeLand" | "convert";
  color?: number;
  carry?: SpecialKind | null;
  tileId?: number;
  /** fired from a grass cell: everything it hits gets grass */
  grassy?: boolean;
};

interface Group {
  color: number;
  cells: Pos[];
  hRuns: Pos[][];
  vRuns: Pos[][];
  squares: Pos[][];
}

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const BANNERS: Record<number, string> = { 2: "Bine!", 3: "Super!", 4: "Minunat!", 6: "Fantastic!" };

/** Fall animation length (seconds) for a tile dropping `rows` cells. Shared with the renderer. */
export function fallSeconds(rows: number): number {
  return 0.07 + 0.1 * Math.sqrt(Math.max(rows, 0));
}

class Step {
  effects: Effect[] = [];
  pending: Activation[] = [];
  sounds = new Set<SoundName>();
  hit = new Set<number>();
  adjDamaged = new Set<number>();
  reserved = new Set<number>();
  grassy = false;
  constructor(public cascade: number) {}
  nextWave() {
    this.effects = [];
    this.sounds = new Set();
    this.hit = new Set();
    this.adjDamaged = new Set();
  }
}

export class Engine {
  readonly rows: number;
  readonly cols: number;
  readonly colors: number;
  cells: Cell[][];
  goals: Goal[];
  movesLeft: number;
  score = 0;
  private nextTileId = 1;
  private nextFxId = 1;
  private rand: () => number;
  private topRow: number[];

  constructor(cfg: LevelConfig, opts: { pre?: SpecialKind[]; rand?: () => number } = {}) {
    this.rand = opts.rand ?? Math.random;
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.colors = cfg.colors;
    this.movesLeft = cfg.moves;
    this.cells = cfg.mask.map((row) =>
      row.map((exists) => ({ exists, tile: null, blocker: null, ice: 0, lock: 0, grass: false })),
    );
    for (const b of cfg.blockers) this.cells[b.r][b.c].blocker = { kind: b.kind, hp: b.hp };
    for (const i of cfg.ice) this.cells[i.r][i.c].ice = i.hp;
    for (const g of cfg.grass) this.cells[g.r][g.c].grass = true;
    this.goals = cfg.goals.map((g) => ({ ...g, remaining: g.target }));
    this.topRow = Array.from({ length: this.cols }, (_, c) => {
      for (let r = 0; r < this.rows; r++) if (this.cells[r][c].exists) return r;
      return 0;
    });
    this.fillInitial();
    for (const l of cfg.locks) if (this.cells[l.r][l.c].tile) this.cells[l.r][l.c].lock = 1;
    if (opts.pre?.length) this.placeSpecials(opts.pre);
    if (!this.findHint()) this.shuffleBoard();
    for (let r = 0; r < this.rows; r++) {
      for (const cell of this.cells[r]) {
        if (!cell.tile) continue;
        cell.tile.spawnRow = r - this.rows - 1;
        cell.tile.intro = true;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  isWon(): boolean {
    return this.goals.every((g) => g.remaining <= 0);
  }

  snapshotFrame(): Frame {
    return this.frame("fall", 0);
  }

  isMovable(p: Pos): boolean {
    const cell = this.cells[p.r]?.[p.c];
    return !!cell && cell.exists && !cell.blocker && !cell.lock && !!cell.tile;
  }

  tileAt(p: Pos): Tile | null {
    return this.cells[p.r]?.[p.c]?.tile ?? null;
  }

  /** Swap two neighbours. Returns null when the swap is not even attempted. */
  trySwap(a: Pos, b: Pos): { frames: Frame[]; valid: boolean } | null {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return null;
    if (!this.isMovable(a) || !this.isMovable(b)) return null;
    const A = this.cells[a.r][a.c].tile!;
    const B = this.cells[b.r][b.c].tile!;
    const frames: Frame[] = [];
    this.swap(a, b);
    frames.push(this.frame("swap", 170, undefined, ["swap"]));

    if (A.special || B.special) {
      this.movesLeft--;
      frames.push(...this.resolve((step) => this.specialSwap(A, b, B, a, step)));
      return { frames, valid: true };
    }
    if (!this.hasMatchAt(a) && !this.hasMatchAt(b)) {
      this.swap(a, b);
      frames.push(this.frame("swapBack", 200, undefined, ["invalid"]));
      return { frames, valid: false };
    }
    this.movesLeft--;
    frames.push(...this.resolve(undefined, [b, a]));
    return { frames, valid: true };
  }

  /** Tap on a special piece. Costs one move. */
  activateAt(p: Pos): Frame[] | null {
    const t = this.tileAt(p);
    if (!t?.special || !this.isMovable(p)) return null;
    this.movesLeft--;
    return this.resolve((step) => {
      this.cells[p.r][p.c].tile = null;
      this.activate({ r: p.r, c: p.c, kind: t.special! }, step);
    });
  }

  useHammer(p: Pos): Frame[] | null {
    const cell = this.cells[p.r]?.[p.c];
    if (!cell?.exists || (!cell.tile && !cell.blocker)) return null;
    return this.resolve((step) => {
      step.effects.push({ id: this.fx(), type: "hammer", r: p.r, c: p.c });
      step.sounds.add("hammer");
      this.hit(p.r, p.c, "blast", step);
    });
  }

  useLine(p: Pos, dir: "h" | "v"): Frame[] | null {
    if (!this.cells[p.r]?.[p.c]?.exists) return null;
    return this.resolve((step) => this.beam(p.r, p.c, dir, step));
  }

  useShuffle(): Frame[] {
    this.shuffleBoard();
    return [this.frame("shuffle", 520, undefined, ["shuffle"])];
  }

  addMoves(n: number) {
    this.movesLeft += n;
  }

  /** Remaining moves turn into rockets that all go off. */
  bonusRound(): Frame[] {
    const frames: Frame[] = [];
    let n = Math.min(this.movesLeft, 15);
    this.score += (this.movesLeft - n) * 300;
    while (n-- > 0) {
      const gems = this.positions((t) => !t.special);
      if (!gems.length) break;
      const p = gems[Math.floor(this.rand() * gems.length)];
      const t = this.cells[p.r][p.c].tile!;
      this.cells[p.r][p.c].tile = { id: t.id, color: -1, special: this.rand() < 0.5 ? "rocketH" : "rocketV", born: true };
      this.movesLeft--;
      this.score += 150;
      frames.push(this.frame("convert", 120, undefined, ["create"]));
    }
    this.movesLeft = 0;
    for (let i = 0; i < 10; i++) {
      const specials = this.positions((t) => !!t.special);
      if (!specials.length) break;
      frames.push(
        ...this.resolve((step) => {
          for (const p of specials) {
            const t = this.cells[p.r][p.c].tile;
            if (!t?.special) continue;
            this.cells[p.r][p.c].tile = null;
            this.activate({ r: p.r, c: p.c, kind: t.special }, step);
          }
        }),
      );
    }
    return frames;
  }

  /** A valid move: two cells to swap, or one special to tap. */
  findHint(): Pos[] | null {
    const swaps: Pos[][] = [];
    let special: Pos | null = null;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = { r, c };
        if (!this.isMovable(p)) continue;
        if (this.cells[r][c].tile!.special) {
          special ??= p;
          continue;
        }
        for (const [dr, dc] of [
          [0, 1],
          [1, 0],
        ]) {
          const q = { r: r + dr, c: c + dc };
          if (!this.isMovable(q) || this.tileAt(q)!.special) continue;
          this.swap(p, q);
          const ok = this.hasMatchAt(p) || this.hasMatchAt(q);
          this.swap(p, q);
          if (ok) swaps.push([p, q]);
        }
      }
    }
    if (swaps.length) return swaps[Math.floor(this.rand() * swaps.length)];
    return special ? [special] : null;
  }

  /** Deep copy used by the simulation bot. */
  clone(): Engine {
    const e = Object.create(Engine.prototype) as Engine;
    Object.assign(e, this);
    e.cells = this.cloneCells();
    e.goals = this.goals.map((g) => ({ ...g }));
    e.topRow = [...this.topRow];
    return e;
  }

  /* ------------------------------------------------------------------ */
  /* Resolution loop                                                     */
  /* ------------------------------------------------------------------ */

  private resolve(pre?: (s: Step) => void, swapCells?: Pos[]): Frame[] {
    const frames: Frame[] = [];
    let cascade = 0;
    for (let guard = 0; guard < 80; guard++) {
      const step = new Step(cascade);
      if (pre && cascade === 0) {
        pre(step);
      } else {
        const groups = this.findMatches();
        if (!groups.length) break;
        this.processMatches(groups, step, cascade === 0 ? swapCells : undefined, cascade);
      }
      if (BANNERS[cascade]) step.effects.push({ id: this.fx(), type: "banner", text: BANNERS[cascade] });
      frames.push(this.frame("clear", this.waveDuration(step), step));
      for (let w = 0; step.pending.length && w < 60; w++) {
        const acts = step.pending;
        step.pending = [];
        step.nextWave();
        for (const a of acts) this.activate(a, step);
        frames.push(this.frame("clear", this.waveDuration(step), step));
      }
      const dist = this.gravity();
      if (dist > 0) frames.push(this.frame("fall", Math.round(fallSeconds(dist) * 1000) + 60, undefined, [], cascade));
      cascade++;
    }
    if (!this.findHint()) {
      this.shuffleBoard();
      const f = this.frame("shuffle", 700, undefined, ["shuffle"]);
      f.effects.push({ id: this.fx(), type: "banner", text: "Amestecăm!" });
      frames.push(f);
    }
    return frames;
  }

  private waveDuration(step: Step): number {
    if (step.effects.some((e) => e.type === "plane")) return 430;
    if (step.effects.some((e) => e.type === "beam" || e.type === "blast" || e.type === "rainbow")) return 300;
    return 240;
  }

  private processMatches(groups: Group[], step: Step, swapCells: Pos[] | undefined, cascade: number) {
    const creations: (Pos & { kind: SpecialKind })[] = [];
    for (const g of groups) {
      const kind = classify(g);
      const spot = this.pickSpot(g, swapCells);
      const grassy = g.cells.some((p) => this.cells[p.r][p.c].grass);
      for (const p of g.cells) this.hit(p.r, p.c, "match", step);
      if (grassy) for (const p of g.cells) this.growGrass(p.r, p.c, step);
      for (const p of g.cells) {
        for (const [dr, dc] of DIRS) {
          const r = p.r + dr;
          const c = p.c + dc;
          const n = this.cells[r]?.[c];
          if (!n?.exists || !n.blocker) continue;
          const key = r * this.cols + c;
          if (step.adjDamaged.has(key)) continue;
          step.adjDamaged.add(key);
          this.damageBlocker(r, c, step);
        }
      }
      const pts = Math.round(((g.cells.length * 20 + (kind ? 60 : 0)) * (1 + cascade * 0.5)) / 10) * 10;
      this.score += pts;
      step.effects.push({ id: this.fx(), type: "score", r: spot.r, c: spot.c, value: pts, color: g.color });
      if (kind) creations.push({ ...spot, kind });
    }
    for (const cr of creations) {
      const cell = this.cells[cr.r][cr.c];
      if (cell.tile || cell.blocker) continue;
      cell.tile = { ...this.makeSpecial(cr.kind), born: true };
      step.effects.push({ id: this.fx(), type: "create", r: cr.r, c: cr.c });
      this.countSpecial(cr.kind, cr, step);
    }
    step.sounds.add("match");
    if (creations.length) step.sounds.add("create");
  }

  private pickSpot(g: Group, swapCells?: Pos[]): Pos {
    const has = (p: Pos) => g.cells.some((q) => q.r === p.r && q.c === p.c);
    const free = (p: Pos) => !this.cells[p.r][p.c].lock;
    for (const p of swapCells ?? []) if (has(p)) return p;
    for (const h of g.hRuns)
      for (const p of h) for (const v of g.vRuns) if (free(p) && v.some((q) => q.r === p.r && q.c === p.c)) return p;
    const runs = [...g.hRuns, ...g.vRuns].sort((a, b) => b.length - a.length);
    if (runs.length) {
      const mid = runs[0][Math.floor((runs[0].length - 1) / 2)];
      return free(mid) ? mid : (runs[0].find(free) ?? mid);
    }
    const sq = g.squares[0];
    return sq ? (sq.find(free) ?? sq[2]) : g.cells[0];
  }

  /* ------------------------------------------------------------------ */
  /* Specials                                                            */
  /* ------------------------------------------------------------------ */

  private specialSwap(A: Tile, posA: Pos, B: Tile, posB: Pos, step: Step) {
    if (A.special && B.special) {
      this.cells[posA.r][posA.c].tile = null;
      this.cells[posB.r][posB.c].tile = null;
      this.combo(A.special, B.special, posA, step);
      return;
    }
    const sTile = A.special ? A : B;
    const gTile = A.special ? B : A;
    const sPos = A.special ? posA : posB;
    this.cells[sPos.r][sPos.c].tile = null;
    if (sTile.special === "rainbow") this.activate({ ...sPos, kind: "rainbow", color: gTile.color }, step);
    else this.activate({ ...sPos, kind: sTile.special! }, step);
  }

  private combo(k1: SpecialKind, k2: SpecialKind, p: Pos, step: Step) {
    const isRocket = (k: SpecialKind) => k === "rocketH" || k === "rocketV";
    const has = (k: SpecialKind) => k1 === k || k2 === k;
    const before = this.score;
    const prevGrassy = step.grassy;
    step.grassy = this.cells[p.r][p.c].grass;
    step.effects.push({ id: this.fx(), type: "banner", text: "Combo!" });
    if (k1 === "rainbow" && k2 === "rainbow") {
      step.effects.push({ id: this.fx(), type: "blast", r: p.r, c: p.c, radius: 12 });
      step.sounds.add("rainbow").add("bomb");
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.hit(r, c, "blast", step);
      this.score += 2000;
    } else if (has("rainbow")) {
      this.convert(p.r, p.c, k1 === "rainbow" ? k2 : k1, step);
    } else if (isRocket(k1) && isRocket(k2)) {
      this.beam(p.r, p.c, "h", step);
      this.beam(p.r, p.c, "v", step);
    } else if ((isRocket(k1) && k2 === "bomb") || (k1 === "bomb" && isRocket(k2))) {
      for (let d = -1; d <= 1; d++) {
        if (p.r + d >= 0 && p.r + d < this.rows) this.beam(p.r + d, p.c, "h", step);
        if (p.c + d >= 0 && p.c + d < this.cols) this.beam(p.r, p.c + d, "v", step);
      }
    } else if (k1 === "bomb" && k2 === "bomb") {
      this.blast(p.r, p.c, 3, step);
    } else if (has("plane")) {
      const other = k1 === "plane" ? k2 : k1;
      if (other === "plane") {
        this.planeLaunch(p.r, p.c, null, step, true);
        this.planeLaunch(p.r, p.c, null, step, false);
        this.planeLaunch(p.r, p.c, null, step, false);
      } else {
        this.planeLaunch(p.r, p.c, other, step, true);
      }
    }
    step.grassy = prevGrassy;
    this.score += 300;
    this.pushScore(p, this.score - before, step);
  }

  private activate(a: Activation, step: Step) {
    const { r, c } = a;
    if (a.tileId != null) {
      const t = this.cells[r][c].tile;
      if (t && t.id === a.tileId) this.cells[r][c].tile = null;
    }
    const before = this.score;
    const prevGrassy = step.grassy;
    step.grassy = a.grassy ?? this.cells[r][c].grass;
    switch (a.kind) {
      case "rocketH":
        this.beam(r, c, "h", step);
        break;
      case "rocketV":
        this.beam(r, c, "v", step);
        break;
      case "bomb":
        this.blast(r, c, 2, step);
        break;
      case "plane":
        this.planeLaunch(r, c, a.carry ?? null, step, true);
        break;
      case "planeLand":
        if (a.carry) this.activate({ r, c, kind: a.carry, grassy: a.grassy }, step);
        else this.hit(r, c, "blast", step);
        break;
      case "rainbow":
        this.rainbow(r, c, a.color, step);
        break;
      case "convert":
        this.convert(r, c, a.carry!, step);
        break;
    }
    step.grassy = prevGrassy;
    if (a.kind !== "planeLand" || !a.carry) this.pushScore({ r, c }, this.score - before, step);
  }

  /** "Make N bombs" style goals count a special when it is created. */
  private countSpecial(kind: SpecialKind, p: Pos, step: Step) {
    this.collect("special", step, p.r, p.c, { special: kind === "rocketV" ? "rocketH" : kind });
  }

  private pushScore(p: Pos, value: number, step: Step) {
    if (value <= 0) return;
    step.effects.push({ id: this.fx(), type: "score", r: p.r, c: p.c, value, color: -1 });
  }

  private beam(r: number, c: number, dir: "h" | "v", step: Step) {
    step.effects.push({ id: this.fx(), type: "beam", r, c, dir });
    step.sounds.add("rocket");
    if (dir === "h") for (let cc = 0; cc < this.cols; cc++) this.hit(r, cc, "blast", step);
    else for (let rr = 0; rr < this.rows; rr++) this.hit(rr, c, "blast", step);
  }

  private blast(r: number, c: number, radius: number, step: Step) {
    step.effects.push({ id: this.fx(), type: "blast", r, c, radius });
    step.sounds.add("bomb");
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) === radius && Math.abs(dc) === radius) continue;
        this.hit(r + dr, c + dc, "blast", step);
      }
    }
  }

  private planeLaunch(r: number, c: number, carry: SpecialKind | null, step: Step, cross: boolean) {
    if (cross) {
      this.hit(r, c, "blast", step);
      for (const [dr, dc] of DIRS) this.hit(r + dr, c + dc, "blast", step);
    }
    const t = this.pickTarget(step);
    if (!t) return;
    step.reserved.add(t.r * this.cols + t.c);
    step.effects.push({ id: this.fx(), type: "plane", r, c, tr: t.r, tc: t.c });
    step.sounds.add("plane");
    step.pending.push({ r: t.r, c: t.c, kind: "planeLand", carry, grassy: step.grassy });
  }

  private pickTarget(step: Step): Pos | null {
    const goalLeft = (k: GoalKind) => this.goals.some((g) => g.kind === k && g.remaining > 0);
    const colorGoals = new Set(this.goals.filter((g) => g.kind === "color" && g.remaining > 0).map((g) => g.color));
    const tiers: Pos[][] = [[], [], [], [], []];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const key = r * this.cols + c;
        if (!cell.exists || step.hit.has(key) || step.reserved.has(key)) continue;
        if (cell.blocker) {
          if (goalLeft(cell.blocker.kind)) tiers[0].push({ r, c });
        } else if (cell.tile) {
          if (cell.lock && goalLeft("lock")) tiers[0].push({ r, c });
          else if (cell.ice > 0 && goalLeft("ice")) tiers[1].push({ r, c });
          else if (step.grassy && !cell.grass && goalLeft("grass")) tiers[1].push({ r, c });
          else if (!cell.tile.special && colorGoals.has(cell.tile.color)) tiers[2].push({ r, c });
          else if (!cell.tile.special) tiers[3].push({ r, c });
          else tiers[4].push({ r, c });
        }
      }
    }
    const tier = tiers.find((t) => t.length);
    return tier ? tier[Math.floor(this.rand() * tier.length)] : null;
  }

  private rainbow(r: number, c: number, color: number | undefined, step: Step) {
    const col = color ?? this.mostCommonColor();
    const targets = this.positions((t) => !t.special && t.color === col, true);
    step.effects.push({ id: this.fx(), type: "rainbow", r, c, targets });
    step.sounds.add("rainbow");
    this.hit(r, c, "blast", step);
    for (const p of targets) this.hit(p.r, p.c, "blast", step);
  }

  private convert(r: number, c: number, kind: SpecialKind, step: Step) {
    const col = this.mostCommonColor();
    const targets = this.positions((t) => !t.special && t.color === col);
    step.effects.push({ id: this.fx(), type: "rainbow", r, c, targets });
    step.sounds.add("rainbow");
    for (const p of targets) {
      const t = this.cells[p.r][p.c].tile!;
      const special: SpecialKind =
        kind === "rocketH" || kind === "rocketV" ? (this.rand() < 0.5 ? "rocketH" : "rocketV") : kind;
      this.cells[p.r][p.c].tile = { id: t.id, color: -1, special, armed: true, born: true };
      this.countSpecial(special, p, step);
      step.pending.push({ r: p.r, c: p.c, kind: special, tileId: t.id, grassy: step.grassy || undefined });
    }
  }

  private mostCommonColor(): number {
    const counts = new Array(this.colors).fill(0);
    for (const row of this.cells) for (const cell of row) if (cell.tile && !cell.tile.special) counts[cell.tile.color]++;
    let best = 0;
    for (let k = 1; k < counts.length; k++) if (counts[k] > counts[best]) best = k;
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* Damage                                                              */
  /* ------------------------------------------------------------------ */

  private hit(r: number, c: number, source: "match" | "blast", step: Step) {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;
    const cell = this.cells[r][c];
    if (!cell.exists) return;
    if (cell.blocker) {
      if (source === "blast") this.damageBlocker(r, c, step);
      return;
    }
    const key = r * this.cols + c;
    const already = step.hit.has(key);
    step.hit.add(key);
    if (step.grassy) this.growGrass(r, c, step);
    if (cell.lock > 0 && cell.tile) {
      if (already) return;
      cell.lock--;
      step.effects.push({ id: this.fx(), type: "shard", r, c, kind: "lock" });
      step.sounds.add("lock");
      this.score += 40;
      if (cell.lock === 0) this.collect("lock", step, r, c);
      return;
    }
    const t = cell.tile;
    if (t) {
      cell.tile = null;
      if (t.special) {
        if (!t.armed) step.pending.push({ r, c, kind: t.special, grassy: cell.grass || undefined });
      } else {
        step.effects.push({ id: this.fx(), type: "pop", r, c, color: t.color });
        this.collect("color", step, r, c, { color: t.color });
        if (source === "blast") this.score += 20;
      }
      this.damageIce(r, c, step);
    } else if (!already && source === "blast") {
      this.damageIce(r, c, step);
    }
  }

  private growGrass(r: number, c: number, step: Step) {
    const cell = this.cells[r]?.[c];
    if (!cell?.exists || cell.blocker || cell.grass) return;
    cell.grass = true;
    step.sounds.add("grass");
    this.score += 20;
    this.collect("grass", step, r, c);
  }

  private damageBlocker(r: number, c: number, step: Step) {
    const cell = this.cells[r][c];
    const b = cell.blocker;
    if (!b) return;
    b.hp--;
    step.effects.push({ id: this.fx(), type: "shard", r, c, kind: b.kind });
    step.sounds.add(b.kind);
    this.score += 40;
    if (b.hp <= 0) {
      cell.blocker = null;
      this.collect(b.kind, step, r, c);
    }
  }

  private damageIce(r: number, c: number, step: Step) {
    const cell = this.cells[r][c];
    if (cell.ice <= 0) return;
    cell.ice--;
    step.effects.push({ id: this.fx(), type: "shard", r, c, kind: "ice" });
    step.sounds.add("ice");
    this.score += 30;
    if (cell.ice === 0) this.collect("ice", step, r, c);
  }

  private collect(
    kind: GoalKind | BlockerKind,
    step: Step,
    r: number,
    c: number,
    match: { color?: number; special?: SpecialKind } = {},
  ) {
    const i = this.goals.findIndex(
      (g) =>
        g.kind === kind &&
        g.remaining > 0 &&
        (kind !== "color" || g.color === match.color) &&
        (kind !== "special" || g.special === match.special),
    );
    if (i < 0) return;
    this.goals[i].remaining--;
    step.effects.push({ id: this.fx(), type: "collect", r, c, goal: i });
  }

  /* ------------------------------------------------------------------ */
  /* Board mechanics                                                     */
  /* ------------------------------------------------------------------ */

  private findMatches(): Group[] {
    const R = this.rows;
    const C = this.cols;
    const parent = new Int32Array(R * C).fill(-1);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a: number, b: number) => {
      if (parent[a] === -1) parent[a] = a;
      if (parent[b] === -1) parent[b] = b;
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    const hRuns: Pos[][] = [];
    const vRuns: Pos[][] = [];
    const squares: Pos[][] = [];

    for (let r = 0; r < R; r++) {
      let c = 0;
      while (c < C) {
        const k = this.colorAt(r, c);
        let e = c;
        if (k >= 0) while (e + 1 < C && this.colorAt(r, e + 1) === k) e++;
        if (k >= 0 && e - c + 1 >= 3) {
          const run: Pos[] = [];
          for (let x = c; x <= e; x++) {
            run.push({ r, c: x });
            if (x > c) union(r * C + x - 1, r * C + x);
          }
          hRuns.push(run);
        }
        c = e + 1;
      }
    }
    for (let c = 0; c < C; c++) {
      let r = 0;
      while (r < R) {
        const k = this.colorAt(r, c);
        let e = r;
        if (k >= 0) while (e + 1 < R && this.colorAt(e + 1, c) === k) e++;
        if (k >= 0 && e - r + 1 >= 3) {
          const run: Pos[] = [];
          for (let y = r; y <= e; y++) {
            run.push({ r: y, c });
            if (y > r) union((y - 1) * C + c, y * C + c);
          }
          vRuns.push(run);
        }
        r = e + 1;
      }
    }
    for (let r = 0; r < R - 1; r++) {
      for (let c = 0; c < C - 1; c++) {
        const k = this.colorAt(r, c);
        if (k < 0 || this.colorAt(r, c + 1) !== k || this.colorAt(r + 1, c) !== k || this.colorAt(r + 1, c + 1) !== k)
          continue;
        const sq = [
          { r, c },
          { r, c: c + 1 },
          { r: r + 1, c },
          { r: r + 1, c: c + 1 },
        ];
        squares.push(sq);
        union(r * C + c, r * C + c + 1);
        union(r * C + c, (r + 1) * C + c);
        union(r * C + c, (r + 1) * C + c + 1);
      }
    }

    const byRoot = new Map<number, Group>();
    for (let i = 0; i < R * C; i++) {
      if (parent[i] === -1) continue;
      const root = find(i);
      let g = byRoot.get(root);
      if (!g) {
        g = { color: this.colorAt(Math.floor(i / C), i % C), cells: [], hRuns: [], vRuns: [], squares: [] };
        byRoot.set(root, g);
      }
      g.cells.push({ r: Math.floor(i / C), c: i % C });
    }
    const groupOf = (p: Pos) => byRoot.get(find(p.r * C + p.c))!;
    for (const run of hRuns) groupOf(run[0]).hRuns.push(run);
    for (const run of vRuns) groupOf(run[0]).vRuns.push(run);
    for (const sq of squares) groupOf(sq[0]).squares.push(sq);
    return [...byRoot.values()];
  }

  private colorAt(r: number, c: number): number {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return -1;
    const t = this.cells[r][c].tile;
    return t && !t.special ? t.color : -1;
  }

  private hasMatchAt(p: Pos): boolean {
    const k = this.colorAt(p.r, p.c);
    if (k < 0) return false;
    let h = 1;
    for (let c = p.c - 1; this.colorAt(p.r, c) === k; c--) h++;
    for (let c = p.c + 1; this.colorAt(p.r, c) === k; c++) h++;
    if (h >= 3) return true;
    let v = 1;
    for (let r = p.r - 1; this.colorAt(r, p.c) === k; r--) v++;
    for (let r = p.r + 1; this.colorAt(r, p.c) === k; r++) v++;
    if (v >= 3) return true;
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [0, -1],
      [0, 0],
    ]) {
      const r0 = p.r + dr;
      const c0 = p.c + dc;
      if (
        this.colorAt(r0, c0) === k &&
        this.colorAt(r0 + 1, c0) === k &&
        this.colorAt(r0, c0 + 1) === k &&
        this.colorAt(r0 + 1, c0 + 1) === k
      )
        return true;
    }
    return false;
  }

  /** Drops tiles, slides them diagonally around blockers and spawns new ones. Returns the longest fall in rows. */
  private gravity(): number {
    const origin = new Map<number, number>();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[r][c].tile;
        if (t) origin.set(t.id, r);
      }
    }
    const spawned = new Array(this.cols).fill(0);
    let flip = false;
    for (let guard = 0; guard < 400; guard++) {
      this.verticalPass(spawned);
      flip = !flip;
      if (!this.diagonalOnce(flip)) break;
    }
    let maxDist = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[r][c].tile;
        if (!t) continue;
        const from = origin.get(t.id) ?? t.spawnRow;
        if (from !== undefined && r - from > maxDist) maxDist = r - from;
      }
    }
    return maxDist;
  }

  /** Blockers and chained tiles hold everything above them in place. */
  private isBarrier(cell: Cell): boolean {
    return cell.exists && (!!cell.blocker || cell.lock > 0);
  }

  private verticalPass(spawned: number[]) {
    for (let c = 0; c < this.cols; c++) {
      for (let r = this.rows - 1; r >= 0; r--) {
        const cell = this.cells[r][c];
        if (!cell.exists || cell.blocker || cell.tile) continue;
        let rr = r - 1;
        let blocked = false;
        let filled = false;
        while (rr >= 0) {
          const up = this.cells[rr][c];
          if (this.isBarrier(up)) {
            blocked = true;
            break;
          }
          if (up.exists && up.tile) {
            cell.tile = up.tile;
            up.tile = null;
            filled = true;
            break;
          }
          rr--;
        }
        if (!filled && !blocked) {
          const t = this.makeGem(this.spawnColor(r, c));
          t.spawnRow = this.topRow[c] - 1 - spawned[c]++;
          cell.tile = t;
        }
      }
    }
  }

  private diagonalOnce(flip: boolean): boolean {
    for (let r = this.rows - 1; r >= 1; r--) {
      for (let i = 0; i < this.cols; i++) {
        const c = flip ? i : this.cols - 1 - i;
        const cell = this.cells[r][c];
        if (!cell.exists || cell.blocker || cell.tile) continue;
        for (const dc of flip ? [-1, 1] : [1, -1]) {
          const src = this.cells[r - 1][c + dc];
          if (!src?.exists || src.blocker || src.lock || !src.tile) continue;
          const below = this.cells[r][c + dc];
          if (below?.exists && !below.blocker && !below.tile) continue;
          cell.tile = src.tile;
          src.tile = null;
          return true;
        }
      }
    }
    return false;
  }

  private swap(a: Pos, b: Pos) {
    const t = this.cells[a.r][a.c].tile;
    this.cells[a.r][a.c].tile = this.cells[b.r][b.c].tile;
    this.cells[b.r][b.c].tile = t;
  }

  private fillInitial() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.exists && !cell.blocker) cell.tile = this.makeGem(this.safeColor(r, c));
      }
    }
  }

  private safeColor(r: number, c: number): number {
    const banned = new Set<number>();
    const l1 = this.colorAt(r, c - 1);
    const u1 = this.colorAt(r - 1, c);
    if (l1 >= 0 && l1 === this.colorAt(r, c - 2)) banned.add(l1);
    if (u1 >= 0 && u1 === this.colorAt(r - 2, c)) banned.add(u1);
    if (l1 >= 0 && l1 === u1 && u1 === this.colorAt(r - 1, c - 1)) banned.add(l1);
    const options: number[] = [];
    for (let k = 0; k < this.colors; k++) if (!banned.has(k)) options.push(k);
    return options[Math.floor(this.rand() * options.length)] ?? 0;
  }

  /** Most of the time new gems avoid forming an instant match, so cascades feel earned instead of constant. */
  private spawnColor(r: number, c: number): number {
    const k = Math.floor(this.rand() * this.colors);
    if (this.rand() > Engine.SPAWN_ASSIST) return k;
    for (let i = 0; i < this.colors; i++) {
      const cand = (k + i) % this.colors;
      if (!this.wouldMatch(r, c, cand)) return cand;
    }
    return k;
  }

  static SPAWN_ASSIST = 0.7;

  private wouldMatch(r: number, c: number, k: number): boolean {
    const at = (rr: number, cc: number) => this.colorAt(rr, cc) === k;
    if (at(r + 1, c) && at(r + 2, c)) return true;
    if (at(r, c - 1) && (at(r, c - 2) || at(r, c + 1))) return true;
    if (at(r, c + 1) && at(r, c + 2)) return true;
    for (const [dr, dc] of [
      [0, -1],
      [0, 1],
    ]) {
      if (at(r, c + dc) && at(r + 1, c) && at(r + 1, c + dc)) return true;
      if (at(r + dr, c + dc) && at(r - 1, c) && at(r - 1, c + dc)) return true;
    }
    return false;
  }

  private placeSpecials(kinds: SpecialKind[]) {
    for (const kind of kinds) {
      const spots = this.positions((t) => !t.special).filter((p) => p.r >= 2);
      if (!spots.length) return;
      const p = spots[Math.floor(this.rand() * spots.length)];
      this.cells[p.r][p.c].tile = this.makeSpecial(kind);
    }
  }

  private shuffleBoard() {
    const spots = this.positions((t) => !t.special);
    const tiles = spots.map((p) => this.cells[p.r][p.c].tile!);
    for (let attempt = 0; attempt < 80; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
      spots.forEach((p, i) => (this.cells[p.r][p.c].tile = tiles[i]));
      if (!this.findMatches().length && this.findHint()) return;
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      for (const p of spots) this.cells[p.r][p.c].tile!.color = -2;
      for (const p of spots) this.cells[p.r][p.c].tile!.color = this.safeColor(p.r, p.c);
      if (this.findHint()) return;
    }
  }

  /** Cells holding a tile that matches `pred`; chained tiles only when asked for. */
  private positions(pred: (t: Tile) => boolean, includeLocked = false): Pos[] {
    const out: Pos[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.exists && !cell.blocker && cell.tile && (includeLocked || !cell.lock) && pred(cell.tile))
          out.push({ r, c });
      }
    }
    return out;
  }

  private makeGem(color: number): Tile {
    return { id: this.nextTileId++, color, special: null };
  }

  private makeSpecial(kind: SpecialKind): Tile {
    return { id: this.nextTileId++, color: -1, special: kind };
  }

  private fx(): number {
    return this.nextFxId++;
  }

  private cloneCells(): Cell[][] {
    return this.cells.map((row) =>
      row.map((c) => ({
        exists: c.exists,
        ice: c.ice,
        lock: c.lock,
        grass: c.grass,
        blocker: c.blocker ? { ...c.blocker } : null,
        tile: c.tile ? { ...c.tile } : null,
      })),
    );
  }

  private frame(kind: FrameKind, duration: number, step?: Step, sounds: SoundName[] = [], cascade = 0): Frame {
    const cells = this.cloneCells();
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.tile) {
          delete cell.tile.spawnRow;
          delete cell.tile.born;
          delete cell.tile.intro;
        }
      }
    }
    return {
      kind,
      cells,
      effects: step ? step.effects : [],
      goals: this.goals.map((g) => ({ ...g })),
      score: this.score,
      movesLeft: this.movesLeft,
      duration,
      sounds: step ? [...step.sounds] : sounds,
      cascade: step ? step.cascade : cascade,
    };
  }
}

function classify(g: Group): SpecialKind | null {
  const maxH = Math.max(0, ...g.hRuns.map((r) => r.length));
  const maxV = Math.max(0, ...g.vRuns.map((r) => r.length));
  if (Math.max(maxH, maxV) >= 5) return "rainbow";
  if (g.hRuns.length && g.vRuns.length) {
    for (const h of g.hRuns)
      for (const p of h) for (const v of g.vRuns) if (v.some((q) => q.r === p.r && q.c === p.c)) return "bomb";
  }
  if (maxH === 4) return "rocketH";
  if (maxV === 4) return "rocketV";
  if (g.squares.length) return "plane";
  return null;
}
