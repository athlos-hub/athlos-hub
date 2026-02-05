"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RiListCheck2 } from "react-icons/ri";
import { BiRadar } from "react-icons/bi";
import { FiUsers } from "react-icons/fi";

export default function Home() {
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    const calcHeader = () => {
      const header =
        document.querySelector("header") ||
        document.querySelector("nav") ||
        document.querySelector('[role="navigation"]');

      const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
      setHeaderH(h);
    };

    calcHeader();
    window.addEventListener("resize", calcHeader);
    return () => window.removeEventListener("resize", calcHeader);
  }, []);

  return (
    <main className="w-full">
      <section
        style={{
          top: headerH,
          height: `calc(100svh - ${headerH}px)`,
        }}
        className="fixed left-0 right-0 overflow-hidden bg-secondary"
      >
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/background.svg"
            alt=""
            fill
            priority
            className="object-cover object-left"
          />
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block">
          <div
            className="relative h-full"
            style={{
              width: "clamp(520px, 42vw, 760px)",
            }}
          >
            <Image
              src="/images/banner_runner.png"
              alt="Atleta correndo"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 0px"
              className="object-contain object-right-bottom"
            />
          </div>
        </div>

        <div className="relative mx-auto h-full w-full max-w-7xl px-6 lg:px-10">
          <div className="grid h-full grid-cols-1 items-center lg:grid-cols-2">
            <div className="relative z-10">
              <h2 className="text-[#009C54] text-[52px] sm:text-[64px] lg:text-[72px] leading-[0.95] tracking-tight">
                ATHLOS HUB
              </h2>

              <h1 className="mt-2 text-[52px] sm:text-[64px] lg:text-[76px] font-normal leading-[0.9] tracking-tight text-foreground">
                ESPORTE DO SEU JEITO!
              </h1>

              <p className="mt-5 max-w-lg text-muted-foreground text-[16px] sm:text-[18px] leading-relaxed hyphens-auto">
                Crie, gerencie e acompanhe as suas competições esportivas.
              </p>

              <div className="mt-7">
                <Link
                href="/competitions"
                className="inline-flex items-center gap-3 rounded-full bg-[#00014E] px-6 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition"
                >
                  Ver competições <span aria-hidden>→</span>
                </Link>
              </div>

              <div className="mt-14">
                <h3 className="font-semibold text-[13px] sm:text-[16px] tracking-[0.1em] text-foreground uppercase">
                  O QUE OFERECEMOS
                </h3>

                <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
                  <Offer
                    icon={<RiListCheck2 />}
                    title="GESTÃO ESPORTIVA COMPLETA"
                    desc="Centralize a gestão de organizações e clubes."
                  />
                  <Offer
                    icon={<BiRadar />}
                    title="ACOMPANHE OS RESULTADOS EM TEMPO REAL"
                    desc="Acompanhe jogos e estatísticas."
                  />
                  <Offer
                    icon={<FiUsers />}
                    title="UMA CAMADA DE INTERAÇÃO SOCIAL COMPLETA"
                    desc="Posts, comentários e notificações."
                  />
                </div>
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      <div style={{ height: `calc(100svh - ${headerH}px)` }} />
    </main>
  );
}

function Offer({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="max-w-[280px]">
      <div className="flex items-start gap-3">
        <span className="mt-[1px] text-foreground text-[26px] sm:text-[28px] opacity-80 leading-none">
          {icon}
        </span>

        <div>
          <h4 className="font-semibold text-[14px] sm:text-[15px] tracking-[0.08em] text-foreground leading-[1.2] uppercase">
            {title}
          </h4>

          <p className="mt-2 text-[13px] sm:text-[14px] text-muted-foreground leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}
