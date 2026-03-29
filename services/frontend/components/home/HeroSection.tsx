"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { HeroRightVisual } from "@/components/home/HeroRightVisual";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeroSectionProps {
  isAuthenticated: boolean;
}

/** Altura reservada para a faixa “Explorar” + respiro inferior */
const EXPLORE_ZONE_PX = 100;

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    const calcHeader = () => {
      const el = document.getElementById("app-header");
      const h = el ? Math.round(el.getBoundingClientRect().height) : 0;
      setHeaderH(h);
    };
    calcHeader();
    window.addEventListener("resize", calcHeader);
    return () => window.removeEventListener("resize", calcHeader);
  }, []);

  const primaryHref = isAuthenticated ? "/organizations" : "/auth/cadastro";
  const primaryLabel = isAuthenticated ? "Criar competição" : "Criar conta grátis";

  const topPad = headerH > 0 ? headerH + 16 : 88;
  const mainRowMinHeight = `calc(100svh - ${topPad + EXPLORE_ZONE_PX}px)`;

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative left-1/2 w-[100vw] min-w-0 -translate-x-1/2 overflow-hidden border-b border-border bg-secondary -mt-px"
      style={{ minHeight: "100svh" }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <svg
          className="h-full w-full text-foreground/10"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern
              id="hero-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/background.svg"
          alt=""
          fill
          priority
          className="object-cover object-left"
        />
      </div>

      <div
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-6 lg:px-10"
        style={{ paddingTop: topPad }}
      >
        <div
          className="grid min-h-0 w-full flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12"
          style={{ minHeight: mainRowMinHeight }}
        >
          <div className="flex max-w-xl flex-col justify-center text-left">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Athlos Hub
            </p>
            <h1
              id="home-hero-heading"
              className="mt-3 text-4xl font-normal leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Crie, gerencie e acompanhe as suas{" "}
              <span className="text-main">competições esportivas</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Uma plataforma para organizar torneios, acompanhar placares ao vivo e
              conectar organizadores, atletas e torcedores em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className={cn(buttonVariants({ size: "lg" }), "bg-main text-white hover:bg-main/90")}
              >
                {primaryLabel}
              </Link>
              <Link
                href="/jogos"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Ver jogos ao vivo
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroRightVisual />
          </div>
        </div>

        <div className="flex shrink-0 justify-center pb-8 pt-4 lg:pb-10">
          <a
            href="#home-highlights"
            className="inline-flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Rolar para destaques da plataforma"
          >
            <span className="text-xs font-medium uppercase tracking-wide">
              Explorar
            </span>
            <ChevronDown
              className="size-6 motion-safe:animate-bounce motion-reduce:animate-none"
              aria-hidden
            />
          </a>
        </div>
      </div>
    </section>
  );
}
