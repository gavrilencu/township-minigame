import { Gem, SpecialArt } from "../art/Pieces";
import type { SpecialKind } from "@/lib/game/types";

const ROWS: { kind: SpecialKind; pattern: string; text: string }[] = [
  { kind: "rocketH", pattern: "4 în linie", text: "Rachetă: curăță tot rândul sau coloana" },
  { kind: "plane", pattern: "Pătrat 2×2", text: "Avion: zboară spre obiectivul tău" },
  { kind: "bomb", pattern: "Formă L sau T", text: "Bombă: explodează tot în jur" },
  { kind: "rainbow", pattern: "5 în linie", text: "Glob: șterge o culoare întreagă" },
];

export function HowToPlay() {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="panel-inset flex items-center gap-3 p-2.5">
        <div className="flex shrink-0 -space-x-1.5">
          <Gem color={1} className="h-8 w-8" />
          <Gem color={1} className="h-8 w-8" />
          <Gem color={1} className="h-8 w-8" />
        </div>
        <p className="text-[14px] leading-snug font-medium">Glisează o bijuterie ca să aliniezi 3 sau mai multe la fel.</p>
      </div>
      {ROWS.map((r) => (
        <div key={r.kind} className="panel-inset flex items-center gap-3 p-2.5">
          <div className="h-10 w-10 shrink-0">
            <SpecialArt kind={r.kind} />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold text-[#7a3fe0]">{r.pattern}</div>
            <div className="text-[14px] font-medium">{r.text}</div>
          </div>
        </div>
      ))}
      <p className="px-1 text-center text-[13px] leading-snug text-ink-soft">
        Atinge o piesă specială ca s-o declanșezi. Combină două piese speciale între ele pentru efecte uriașe!
      </p>
    </div>
  );
}
