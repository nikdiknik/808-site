import Image from "next/image";
import clsx from "clsx";

import type { CoverId } from "@/lib/track-options";

type CoverArtProps = {
  coverId: CoverId;
  className?: string;
};

const coverAssets: Record<CoverId, string> = {
  "acid-grid": "/assets/covers/acid-grid.png",
  "neon-orbit": "/assets/covers/neon-orbit.png",
  "green-wave": "/assets/covers/green-wave.png",
  "signal-core": "/assets/covers/signal-core.png",
  "dark-pulse": "/assets/covers/dark-pulse.png",
};

export function CoverArt({ coverId, className }: CoverArtProps) {
  return (
    <div className={clsx("relative overflow-hidden rounded-[22px] bg-[#050505]", className)}>
      <Image src={coverAssets[coverId]} alt="" fill sizes="(max-width: 768px) 30vw, 360px" className="object-cover" />
    </div>
  );
}
