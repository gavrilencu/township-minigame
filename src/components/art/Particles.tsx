import { memo, type CSSProperties } from "react";
import { mulberry32 } from "@/lib/game/rng";

export type ParticleKind = "petals" | "sparkles" | "bubbles" | "dust" | "snow" | "embers" | "stars" | "fireflies";

const STAR_CLIP = "polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)";

function look(kind: ParticleKind, r: () => number): { style: CSSProperties; motion: "pt-fall" | "pt-rise" | "pt-drift"; speed: number } {
  switch (kind) {
    case "petals": {
      const s = 7 + r() * 7;
      return {
        motion: "pt-fall",
        speed: 9 + r() * 7,
        style: { width: s, height: s * 0.8, borderRadius: "100% 0 100% 0", background: ["#ffb3cf", "#ff8fb8", "#ffd6e4"][Math.floor(r() * 3)], opacity: 0.9 },
      };
    }
    case "snow": {
      const s = 3 + r() * 5;
      return { motion: "pt-fall", speed: 8 + r() * 8, style: { width: s, height: s, borderRadius: "50%", background: "#fff", boxShadow: "0 0 6px rgb(255 255 255 / 0.8)" } };
    }
    case "bubbles": {
      const s = 6 + r() * 10;
      return {
        motion: "pt-rise",
        speed: 10 + r() * 8,
        style: { width: s, height: s, borderRadius: "50%", border: "1.5px solid rgb(255 255 255 / 0.8)", background: "radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.7), rgb(255 255 255 / 0.05) 60%)" },
      };
    }
    case "embers": {
      const s = 3 + r() * 4;
      return { motion: "pt-rise", speed: 5 + r() * 5, style: { width: s, height: s, borderRadius: "50%", background: "#ffb347", boxShadow: "0 0 8px 2px rgb(255 120 30 / 0.8)" } };
    }
    case "dust": {
      const s = 2 + r() * 3;
      return { motion: "pt-drift", speed: 6 + r() * 6, style: { width: s, height: s, borderRadius: "50%", background: "rgb(255 236 190 / 0.8)" } };
    }
    case "fireflies": {
      const s = 3 + r() * 3;
      return { motion: "pt-drift", speed: 4 + r() * 4, style: { width: s, height: s, borderRadius: "50%", background: "#f6ff8a", boxShadow: "0 0 8px 3px rgb(220 255 120 / 0.7)" } };
    }
    case "stars": {
      const s = 4 + r() * 6;
      return { motion: "pt-drift", speed: 5 + r() * 5, style: { width: s, height: s, clipPath: STAR_CLIP, background: "#fff", filter: "drop-shadow(0 0 3px #fff)" } };
    }
    default: {
      const s = 5 + r() * 6;
      return { motion: "pt-fall", speed: 9 + r() * 6, style: { width: s, height: s, clipPath: STAR_CLIP, background: "#ffe9a8", filter: "drop-shadow(0 0 3px rgb(255 230 150 / 0.9))" } };
    }
  }
}

/** Slow ambient particles matched to the world: petals, snow, embers and so on. */
export const WorldParticles = memo(function WorldParticles({ kind, count = 16, seed = 1 }: { kind: ParticleKind; count?: number; seed?: number }) {
  const r = mulberry32(seed * 7919 + 13);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const { style, motion, speed } = look(kind, r);
        const drift = motion === "pt-drift";
        return (
          <span
            key={i}
            className={`pt ${motion}`}
            style={
              {
                ...style,
                left: `${r() * 100}%`,
                top: drift ? `${8 + r() * 80}%` : motion === "pt-rise" ? "100%" : "-5%",
                animationDuration: `${speed}s`,
                animationDelay: `${-r() * speed}s`,
                "--sx": `${(r() - 0.5) * 120}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});
