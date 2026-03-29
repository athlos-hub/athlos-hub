"use client";

import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Decoração animada do hero (sem imagem). Respeita prefers-reduced-motion via classes.
 */
export function HeroRightVisual() {
  return (
    <div
      className="relative flex h-full min-h-[260px] w-full items-center justify-center lg:min-h-0"
      aria-hidden
    >
      <div className="relative flex size-[min(85vw,380px)] max-h-[min(50vh,420px)] items-center justify-center lg:size-[min(32vw,440px)]">
        {/* anéis concêntricos */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border border-main/20",
            "motion-safe:animate-spin motion-safe:[animation-duration:32s]"
          )}
        />
        <div
          className={cn(
            "absolute inset-[8%] rounded-full border border-main/15",
            "motion-safe:animate-spin motion-safe:[animation-duration:24s] motion-safe:[animation-direction:reverse]"
          )}
        />
        <div
          className={cn(
            "absolute inset-[18%] rounded-full border border-dashed border-main/25",
            "motion-safe:animate-spin motion-safe:[animation-duration:18s]"
          )}
        />
        {/* brilho pulsante */}
        <div
          className={cn(
            "absolute inset-[28%] rounded-full bg-main/15 blur-2xl",
            "motion-safe:animate-pulse motion-reduce:animate-none"
          )}
        />
        <div className="relative z-[1] flex size-24 items-center justify-center rounded-2xl border border-main/20 bg-background/80 shadow-sm backdrop-blur-sm sm:size-28">
          <Trophy
            className={cn(
              "size-12 text-main sm:size-14",
              "motion-safe:animate-pulse motion-reduce:animate-none"
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        {/* partículas / pontos */}
        <span className="absolute right-[6%] top-[12%] size-2 rounded-full bg-main/40 motion-safe:animate-ping motion-reduce:animate-none" />
        <span
          className="absolute bottom-[18%] left-[10%] size-1.5 rounded-full bg-main/35 motion-safe:animate-ping motion-reduce:animate-none motion-safe:[animation-delay:0.7s]"
        />
        <span
          className="absolute left-[14%] top-[22%] size-1 rounded-full bg-main/30 motion-safe:animate-ping motion-reduce:animate-none motion-safe:[animation-delay:1.2s]"
        />
      </div>
    </div>
  );
}
