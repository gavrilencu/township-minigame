export type SpecialKind = "rocketH" | "rocketV" | "bomb" | "plane" | "rainbow";
export type BlockerKind = "crate" | "cloud";
export type GoalKind = "color" | "crate" | "cloud" | "ice" | "lock" | "grass" | "special";
export type ObstacleKind = BlockerKind | "ice" | "lock" | "grass";
export type Difficulty = "normal" | "hard" | "super";

export interface Pos {
  r: number;
  c: number;
}

export interface Tile {
  id: number;
  /** 0..5 for gems, -1 for specials (specials are colorless) */
  color: number;
  special: SpecialKind | null;
  /** row the tile fell in from (negative = above the board); animation only */
  spawnRow?: number;
  /** freshly created special; animation only */
  born?: boolean;
  /** part of the opening drop-in; animation only */
  intro?: boolean;
  /** already queued for activation (rainbow conversions) */
  armed?: boolean;
}

export interface Blocker {
  kind: BlockerKind;
  hp: number;
}

export interface Cell {
  exists: boolean;
  tile: Tile | null;
  blocker: Blocker | null;
  ice: number;
  /** chained tile: it cannot move and the first hit only breaks the chain */
  lock: number;
  /** grass carpet; spreads through matches that touch it */
  grass: boolean;
}

export interface GoalSpec {
  kind: GoalKind;
  color?: number;
  /** for "special" goals; any rocket counts as "rocketH" */
  special?: SpecialKind;
  target: number;
}

export interface Goal extends GoalSpec {
  remaining: number;
}

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  mask: boolean[][];
  colors: number;
  moves: number;
  goals: GoalSpec[];
  blockers: { r: number; c: number; kind: BlockerKind; hp: number }[];
  ice: { r: number; c: number; hp: number }[];
  locks: Pos[];
  grass: Pos[];
  difficulty: Difficulty;
  /** obstacle introduced for the first time on this level */
  intro?: ObstacleKind | "special";
}

export type SoundName =
  | "swap"
  | "invalid"
  | "match"
  | "create"
  | "rocket"
  | "bomb"
  | "plane"
  | "rainbow"
  | "crate"
  | "cloud"
  | "ice"
  | "lock"
  | "grass"
  | "shuffle"
  | "hammer";

/** How a removed tile leaves the board; `delay` (seconds) lets explosions ripple outwards. */
export interface TileExit {
  delay: number;
  /** slides into this cell first: the pieces of a match merging into a new special */
  merge?: Pos;
  /** destroyed by an explosion rather than a match */
  blast?: boolean;
}

export type Effect =
  | { id: number; type: "pop"; r: number; c: number; color: number; delay: number }
  | { id: number; type: "beam"; r: number; c: number; dir: "h" | "v"; pace: number }
  | { id: number; type: "blast"; r: number; c: number; radius: number }
  | { id: number; type: "plane"; r: number; c: number; tr: number; tc: number }
  | { id: number; type: "rainbow"; r: number; c: number; targets: Pos[]; pace: number }
  | { id: number; type: "score"; r: number; c: number; value: number; color: number }
  | { id: number; type: "shard"; r: number; c: number; kind: BlockerKind | "ice" | "lock"; delay: number }
  | { id: number; type: "collect"; r: number; c: number; goal: number }
  | { id: number; type: "create"; r: number; c: number }
  | { id: number; type: "hammer"; r: number; c: number }
  | { id: number; type: "banner"; text: string };

export type FrameKind = "swap" | "swapBack" | "clear" | "fall" | "shuffle" | "convert";

export interface Frame {
  kind: FrameKind;
  cells: Cell[][];
  effects: Effect[];
  /** tiles removed in this frame, by id */
  removed: Record<number, TileExit>;
  /** the tile the player dragged (drawn on top while swapping) */
  swapped?: number;
  goals: Goal[];
  score: number;
  movesLeft: number;
  duration: number;
  sounds: SoundName[];
  cascade: number;
}
