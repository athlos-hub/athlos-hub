"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface TeamLogoProps {
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
  /** Tamanho fixo do bloco (quadrado), ex.: h-14 w-14 */
  className?: string;
  /** Tamanho do texto da sigla no fallback */
  textClassName?: string;
}

/**
 * Logo do time: imagem opcional ou fallback padronizado (bg-main + sigla).
 */
export function TeamLogo({
  name,
  abbreviation,
  logoUrl,
  className = "h-14 w-14",
  textClassName = "text-base",
}: TeamLogoProps) {
  const abbr = (abbreviation || "?").slice(0, 3).toUpperCase();

  if (logoUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl border border-main/15 bg-muted shadow-sm ring-1 ring-main/10",
          className
        )}
      >
        <Image
          src={logoUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 56px, 64px"
          unoptimized
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-main to-main/85 font-bold text-white shadow-sm ring-1 ring-main/20",
        className
      )}
      aria-hidden
    >
      <span className={cn("leading-none tracking-tight", textClassName)}>{abbr}</span>
    </div>
  );
}
