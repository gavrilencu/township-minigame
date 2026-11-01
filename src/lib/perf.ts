"use client";

/**
 * Low-power detection. Cheap phones report little memory, and when they cannot hold a smooth
 * frame rate on the map the game switches to lighter graphics (fewer particles, no debris sparks).
 */

export function quickLowPowerGuess(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 3) return true;
  return false;
}

/** Sample requestAnimationFrame gaps for `ms` and return the 75th percentile gap in ms. */
export function probeFrameTimes(ms = 1500): Promise<{ p75: number; long: number }> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "undefined") return resolve({ p75: 0, long: 0 });
    const gaps: number[] = [];
    let last = performance.now();
    const start = last;
    const tick = (t: number) => {
      gaps.push(t - last);
      last = t;
      if (t - start < ms) requestAnimationFrame(tick);
      else {
        const s = [...gaps].sort((a, b) => a - b);
        resolve({ p75: s[Math.floor(s.length * 0.75)] ?? 0, long: gaps.filter((g) => g > 50).length });
      }
    };
    requestAnimationFrame(tick);
  });
}
