"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./hologram-logo.module.css";
import { cn } from "@/lib/utils";

const LOGO = "/logo_v2.svg";

/**
 * Logo com efeito holograma/glitch (CSS puro, sem libs).
 * Respeita prefers-reduced-motion.
 */
export function HologramLogo({ className }: { className?: string }) {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className={cn(styles.wrap, "w-full max-w-[min(85vw,280px)]", className)}
      aria-hidden
    >
      <div className={styles.viewport}>
        <div
          className={cn(
            styles.stack,
            !reduceMotion && styles.flicker
          )}
        >
          <Image
            src={LOGO}
            alt=""
            width={750}
            height={750}
            className={styles.baseImg}
            priority
          />

          {!reduceMotion && (
            <>
              <span className={cn(styles.channel, styles.chR)} aria-hidden />
              <span className={cn(styles.channel, styles.chG)} aria-hidden />
              <span className={cn(styles.channel, styles.chB)} aria-hidden />
              <span className={styles.slicePlane} aria-hidden />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
