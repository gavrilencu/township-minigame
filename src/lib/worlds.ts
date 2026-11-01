export const LEVELS_PER_WORLD = 20;

export interface WorldTheme {
  name: string;
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  ground: string;
  path: string;
  decor: string[];
  /** Moon and stars instead of the sun. */
  night?: boolean;
}

const THEMES: WorldTheme[] = [
  { name: "Grădina de Cristal", skyTop: "#f6c66c", skyBottom: "#f4c3d2", hillFar: "#b9a9d8", hillNear: "#6cb35f", ground: "#3d9340", path: "#fff4c9", decor: ["🌸", "🌳", "🍄", "🦋", "🌷"] },
  { name: "Peștera Safirelor", skyTop: "#232c7a", skyBottom: "#6f7fd8", hillFar: "#4e5aae", hillNear: "#3a4596", ground: "#283274", path: "#c9e6ff", decor: ["💎", "🔮", "🦇", "✨", "🪨"], night: true },
  { name: "Laguna de Perle", skyTop: "#38c5e8", skyBottom: "#ffe9c2", hillFar: "#7fd8c7", hillNear: "#f2d39a", ground: "#e8c27e", path: "#fffbe6", decor: ["🐚", "🌴", "🐠", "🦀", "🌊"] },
  { name: "Deșertul de Chihlimbar", skyTop: "#ffb35c", skyBottom: "#ffe7b8", hillFar: "#f0c27b", hillNear: "#e0a55a", ground: "#c98a3f", path: "#fff7e0", decor: ["🌵", "🐪", "🏜️", "🦂", "☀️"] },
  { name: "Castelul de Ametist", skyTop: "#8b5cf6", skyBottom: "#f3d9ff", hillFar: "#b994f2", hillNear: "#9a6fe0", ground: "#7a4fc4", path: "#f3e8ff", decor: ["🏰", "👑", "🦄", "🗝️", "🕯️"] },
  { name: "Tărâmul de Gheață", skyTop: "#7cc7ff", skyBottom: "#f2fbff", hillFar: "#d6ecff", hillNear: "#b8dcf7", ground: "#9cc9ec", path: "#ffffff", decor: ["❄️", "⛄", "🌲", "🐧", "🧊"] },
  { name: "Vulcanul de Rubin", skyTop: "#ff7a59", skyBottom: "#ffd2a8", hillFar: "#d9735a", hillNear: "#b5503e", ground: "#8c3a2c", path: "#ffe8d6", decor: ["🌋", "🔥", "🐉", "🪨", "💥"] },
  { name: "Cerul de Opal", skyTop: "#2d2478", skyBottom: "#b89cf5", hillFar: "#6f5fc9", hillNear: "#5547b3", ground: "#403397", path: "#fef3c7", decor: ["🌙", "⭐", "🪐", "☁️", "🌠"], night: true },
];

const ROMAN = ["", "", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"];

export function worldOf(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / LEVELS_PER_WORLD) + 1;
}

export function worldTheme(world: number): WorldTheme {
  const base = THEMES[(world - 1) % THEMES.length];
  const cycle = Math.floor((world - 1) / THEMES.length) + 1;
  return { ...base, name: base.name + (ROMAN[cycle] ?? ` ${cycle}`) };
}
