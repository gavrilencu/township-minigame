import { memo } from "react";

/**
 * Illustrated avatars drawn from a small set of parts, keyed by the emoji stored on the player,
 * so the same face looks identical on every phone.
 */

type Ears = "round" | "pointy" | "floppy" | "long" | "tuft" | "none";
type Extra = "mane" | "stripes" | "horn" | "beak" | "mask" | "spots" | "tentacles" | "spikes" | "whiskers" | "owl" | "frog";

interface Spec {
  face: string;
  dark: string;
  light: string;
  ears: Ears;
  inner?: string;
  muzzle?: string;
  extra?: Extra[];
  butterfly?: boolean;
}

const SPECS: Record<string, Spec> = {
  "🦊": { face: "#ff8a3d", dark: "#c45a12", light: "#ffb77a", ears: "pointy", inner: "#ffe3c9", muzzle: "#fff3e6", extra: ["whiskers"] },
  "🐼": { face: "#f7f7fb", dark: "#2b2b33", light: "#ffffff", ears: "round", inner: "#2b2b33", extra: ["mask"] },
  "🐱": { face: "#ffb84d", dark: "#c67a12", light: "#ffd890", ears: "pointy", inner: "#ffd6e0", muzzle: "#fff1d6", extra: ["stripes", "whiskers"] },
  "🐶": { face: "#c98a5a", dark: "#7a4a24", light: "#e8b78e", ears: "floppy", inner: "#8a5a34", muzzle: "#f3dcc4", extra: ["spots"] },
  "🦁": { face: "#f4b542", dark: "#a86a0a", light: "#ffd27a", ears: "round", inner: "#d98a1a", muzzle: "#ffe9b8", extra: ["mane"] },
  "🐸": { face: "#5fcf5a", dark: "#2f8a2e", light: "#9ee89a", ears: "none", muzzle: "#c9f3b8", extra: ["frog"] },
  "🐵": { face: "#a56a3e", dark: "#5f3a1e", light: "#c99266", ears: "round", inner: "#e8c4a0", muzzle: "#f0d2b0" },
  "🦄": { face: "#fdf3ff", dark: "#b07cd6", light: "#ffffff", ears: "pointy", inner: "#ffc2ea", muzzle: "#ffe6f5", extra: ["horn", "mane"] },
  "🐯": { face: "#ff9a3b", dark: "#b85a08", light: "#ffc27a", ears: "round", inner: "#ffe3c9", muzzle: "#fff3e6", extra: ["stripes", "whiskers"] },
  "🐨": { face: "#a8adb8", dark: "#5c6270", light: "#d4d8e0", ears: "round", inner: "#e9d4d8", muzzle: "#cfd3dc" },
  "🐰": { face: "#fff7f7", dark: "#d99aa8", light: "#ffffff", ears: "long", inner: "#ffc6d2", muzzle: "#ffe9ee", extra: ["whiskers"] },
  "🐙": { face: "#c45fd6", dark: "#7a2d8a", light: "#e59cf0", ears: "none", extra: ["tentacles"] },
  "🐧": { face: "#2d3450", dark: "#161a2e", light: "#4b557a", ears: "none", muzzle: "#f7f7fb", extra: ["beak"] },
  "🦋": { face: "#ff7ab8", dark: "#9c2f6b", light: "#ffb3d6", ears: "none", butterfly: true },
  "🐲": { face: "#3fbf7a", dark: "#1f7a4a", light: "#8fe8b4", ears: "none", muzzle: "#c9f3d4", extra: ["spikes", "horn"] },
  "🦉": { face: "#b07a4a", dark: "#6b4221", light: "#d8a978", ears: "tuft", inner: "#e8c9a3", muzzle: "#f3e0c4", extra: ["owl", "beak"] },
};

function Eyes({ big, mask }: { big?: boolean; mask?: boolean }) {
  const r = big ? 9 : 6.5;
  return (
    <g>
      {mask && (
        <g fill="#2b2b33">
          <ellipse cx="36" cy="50" rx="13" ry="11" transform="rotate(-18 36 50)" />
          <ellipse cx="64" cy="50" rx="13" ry="11" transform="rotate(18 64 50)" />
        </g>
      )}
      {big && (
        <g fill="#fff">
          <circle cx="37" cy="50" r="12" />
          <circle cx="63" cy="50" r="12" />
        </g>
      )}
      <g fill="#1d1a2e">
        <circle cx="37" cy="50" r={r} />
        <circle cx="63" cy="50" r={r} />
      </g>
      <g fill="#fff">
        <circle cx="39.5" cy="47" r={big ? 3.5 : 2.5} />
        <circle cx="65.5" cy="47" r={big ? 3.5 : 2.5} />
      </g>
    </g>
  );
}

function Face({ s }: { s: Spec }) {
  const extra = s.extra ?? [];
  const has = (e: Extra) => extra.includes(e);
  return (
    <g>
      {/* behind the head */}
      {has("mane") && (
        <g fill={s.dark}>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="50" cy="54" rx="12" ry="46" transform={`rotate(${i * 30} 50 54)`} opacity="0.95" />
          ))}
        </g>
      )}
      {has("tentacles") && (
        <g fill={s.face} stroke={s.dark} strokeWidth="2">
          {[-30, -16, 0, 16, 30].map((x, i) => (
            <path key={i} d={`M${50 + x} 70 q${i % 2 ? 8 : -8} 14 0 28`} fill="none" strokeWidth="9" strokeLinecap="round" stroke={s.face} />
          ))}
        </g>
      )}
      {s.ears === "round" && (
        <g>
          <circle cx="24" cy="30" r="14" fill={s.face} stroke={s.dark} strokeWidth="2.5" />
          <circle cx="76" cy="30" r="14" fill={s.face} stroke={s.dark} strokeWidth="2.5" />
          <circle cx="24" cy="30" r="7" fill={s.inner ?? s.light} />
          <circle cx="76" cy="30" r="7" fill={s.inner ?? s.light} />
        </g>
      )}
      {s.ears === "pointy" && (
        <g>
          <path d="M18 44 L22 10 L46 30 Z" fill={s.face} stroke={s.dark} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M82 44 L78 10 L54 30 Z" fill={s.face} stroke={s.dark} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M24 38 L26 18 L40 30 Z" fill={s.inner ?? s.light} />
          <path d="M76 38 L74 18 L60 30 Z" fill={s.inner ?? s.light} />
        </g>
      )}
      {s.ears === "floppy" && (
        <g>
          <ellipse cx="20" cy="50" rx="11" ry="22" fill={s.inner ?? s.dark} stroke={s.dark} strokeWidth="2.5" transform="rotate(12 20 50)" />
          <ellipse cx="80" cy="50" rx="11" ry="22" fill={s.inner ?? s.dark} stroke={s.dark} strokeWidth="2.5" transform="rotate(-12 80 50)" />
        </g>
      )}
      {s.ears === "long" && (
        <g>
          <ellipse cx="36" cy="18" rx="9" ry="22" fill={s.face} stroke={s.dark} strokeWidth="2.5" transform="rotate(-10 36 18)" />
          <ellipse cx="64" cy="18" rx="9" ry="22" fill={s.face} stroke={s.dark} strokeWidth="2.5" transform="rotate(10 64 18)" />
          <ellipse cx="36" cy="18" rx="4.5" ry="15" fill={s.inner} transform="rotate(-10 36 18)" />
          <ellipse cx="64" cy="18" rx="4.5" ry="15" fill={s.inner} transform="rotate(10 64 18)" />
        </g>
      )}
      {s.ears === "tuft" && (
        <g fill={s.face} stroke={s.dark} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M22 40 L18 12 L44 26 Z" />
          <path d="M78 40 L82 12 L56 26 Z" />
        </g>
      )}
      {/* head */}
      <circle cx="50" cy="54" r="36" fill={s.face} stroke={s.dark} strokeWidth="2.5" />
      <ellipse cx="38" cy="36" rx="16" ry="8" fill={s.light} opacity="0.55" />
      {has("stripes") && (
        <g fill={s.dark} opacity="0.8">
          <path d="M44 20 L50 32 L56 20 Z" />
          <path d="M30 24 L40 34 L36 22 Z" />
          <path d="M70 24 L60 34 L64 22 Z" />
          <path d="M16 56 L28 58 L18 64 Z" />
          <path d="M84 56 L72 58 L82 64 Z" />
        </g>
      )}
      {has("spots") && (
        <g fill={s.dark} opacity="0.75">
          <ellipse cx="66" cy="34" rx="9" ry="7" />
          <circle cx="30" cy="66" r="4" />
        </g>
      )}
      {has("spikes") && (
        <g fill={s.dark}>
          <path d="M34 22 L40 8 L46 22 Z" />
          <path d="M54 22 L60 8 L66 22 Z" />
        </g>
      )}
      {has("horn") && (
        <g>
          <path d="M44 24 L50 -2 L56 24 Z" fill="#ffd166" stroke="#c98a2b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M47 16 L53 12 M46 20 L54 17" stroke="#c98a2b" strokeWidth="1.5" />
        </g>
      )}
      {has("frog") && (
        <g>
          <circle cx="34" cy="24" r="12" fill={s.face} stroke={s.dark} strokeWidth="2.5" />
          <circle cx="66" cy="24" r="12" fill={s.face} stroke={s.dark} strokeWidth="2.5" />
          <circle cx="34" cy="24" r="7" fill="#fff" />
          <circle cx="66" cy="24" r="7" fill="#fff" />
          <circle cx="35" cy="25" r="4" fill="#1d1a2e" />
          <circle cx="67" cy="25" r="4" fill="#1d1a2e" />
        </g>
      )}
      {s.muzzle && !has("frog") && <ellipse cx="50" cy="66" rx={has("owl") ? 14 : 17} ry={has("owl") ? 12 : 13} fill={s.muzzle} />}
      {has("frog") ? (
        <path d="M34 60 Q50 74 66 60" fill="none" stroke={s.dark} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <Eyes big={has("owl")} mask={has("mask")} />
      )}
      {has("beak") ? (
        <path d="M42 60 L50 72 L58 60 Z" fill="#ffa62b" stroke="#c96d08" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        !has("frog") && (
          <g>
            <ellipse cx="50" cy="62" rx="4.5" ry="3.2" fill={s.dark} />
            <path d="M44 68 Q50 73 56 68" fill="none" stroke={s.dark} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )
      )}
      {has("whiskers") && (
        <g stroke={s.dark} strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <path d="M14 62 L30 64 M14 70 L30 68 M86 62 L70 64 M86 70 L70 68" />
        </g>
      )}
      {has("mane") && s.face === "#fdf3ff" && (
        <g>
          {["#ff8ad8", "#8dd0ff", "#b4ff9a", "#ffd166"].map((c, i) => (
            <path key={i} d={`M${30 + i * 6} 22 q-10 -14 ${-8 + i * 2} -26`} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
          ))}
        </g>
      )}
    </g>
  );
}

function Butterfly({ s }: { s: Spec }) {
  return (
    <g>
      <g fill={s.face} stroke={s.dark} strokeWidth="2.5">
        <ellipse cx="30" cy="40" rx="22" ry="26" transform="rotate(-20 30 40)" />
        <ellipse cx="70" cy="40" rx="22" ry="26" transform="rotate(20 70 40)" />
        <ellipse cx="34" cy="70" rx="16" ry="16" />
        <ellipse cx="66" cy="70" rx="16" ry="16" />
      </g>
      <g fill={s.light} opacity="0.8">
        <circle cx="28" cy="36" r="8" />
        <circle cx="72" cy="36" r="8" />
        <circle cx="34" cy="70" r="5" />
        <circle cx="66" cy="70" r="5" />
      </g>
      <ellipse cx="50" cy="56" rx="7" ry="26" fill="#3b2a55" />
      <path d="M46 32 Q40 14 34 10 M54 32 Q60 14 66 10" fill="none" stroke="#3b2a55" strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="40" r="2.5" fill="#fff" />
      <circle cx="54" cy="40" r="2.5" fill="#fff" />
    </g>
  );
}

/** The avatar for an emoji key, or null when the key is unknown. */
export const AvatarArt = memo(function AvatarArt({ emoji, className }: { emoji: string; className?: string }) {
  const s = SPECS[emoji];
  if (!s) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {s.butterfly ? <Butterfly s={s} /> : <Face s={s} />}
    </svg>
  );
});

export const hasAvatarArt = (emoji: string) => emoji in SPECS;
