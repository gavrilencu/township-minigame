"use client";

/**
 * Pieces are drawn once per cell size as bitmaps, so the board animates `<img>` elements
 * instead of hundreds of SVG gradients. Everything comes from the DOM: the hidden piece
 * sources and the shared defs rendered by `PieceSources` / `GemDefs`.
 */

const cache = new Map<string, Promise<string[] | null>>();

function svgSource(id: string): string | null {
  const el = document.getElementById(id);
  return el ? el.innerHTML : null;
}

function rasterize(svg: string, px: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.drawImage(img, 0, 0, px, px);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("svg decode failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

/** Bitmap data URLs for the six base pieces at `px` pixels, or null when rasterizing is not possible. */
export function pieceSprites(px: number, count: number): Promise<string[] | null> {
  const key = `${px}:${count}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const defs = svgSource("gem-defs");
      if (!defs) return null;
      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        const body = svgSource(`piece-src-${i}`);
        if (!body) return null;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">${defs}${body}</svg>`;
        out.push(await rasterize(svg, px));
      }
      return out;
    })().catch(() => null);
    cache.set(key, p);
  }
  return p;
}
