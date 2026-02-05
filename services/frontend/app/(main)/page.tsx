"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { RiListCheck2 } from "react-icons/ri";
import { BiRadar } from "react-icons/bi";
import { FiUsers } from "react-icons/fi";
import { FaArrowRightLong } from "react-icons/fa6";

import { MdOutlineSportsVolleyball } from "react-icons/md";
import { GrTrophy } from "react-icons/gr";
import { LuBox, LuTv } from "react-icons/lu";
import { BsGraphUp } from "react-icons/bs";
import { FaRegCalendarAlt } from "react-icons/fa";
import { MdNotificationsActive } from "react-icons/md";
import { IoMailOpenOutline } from "react-icons/io5";

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
          marginTop: -headerH,
          paddingTop: headerH,
          minHeight: "100svh",
        }}
        className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-secondary box-border"
      >
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/background.svg"
            alt=""
            fill
            priority
            className="object-cover"
          />
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block">

        <div
          className="relative h-full"
          style={{ width: "min(48vw, 780px)" }}
        >
          <Image
            src="/images/banner_runner.png"
            alt="Atleta correndo"
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 0px"
            className="object-contain object-right-top"
          />
        </div>
      </div>

        <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-10">
           <div className="grid min-h-full grid-cols-1 lg:grid-cols-2">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="pt-14 sm:pt-16 lg:pt-24">
                <h2 className="text-[#009C54] text-[52px] sm:text-[64px] lg:text-[72px] leading-[0.95] tracking-tight">
                  ATHLOS HUB
                </h2>

                <h1 className="mt-2 text-[52px] sm:text-[64px] lg:text-[76px] font-normal leading-[0.9] tracking-tight text-foreground">
                  ESPORTE DO SEU JEITO!
                </h1>

                <p className="mt-5 max-w-lg text-muted-foreground text-[16px] sm:text-[18px] leading-relaxed hyphens-auto">
                  Crie, gerencie e acompanhe as suas competições esportivas.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/competicoes/tabelas"
                    className="inline-flex items-center gap-3 rounded-full bg-[#00014E] px-6 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition"
                  >
                    Ver competições <span aria-hidden>→</span>
                  </Link>

                  <Link
                    href="#explore"
                    className="inline-flex items-center gap-3 rounded-full border border-[#97979730] bg-white/70 px-6 py-2.5 text-foreground text-sm font-semibold hover:bg-[#F7F7FB] transition"
                  >
                    Explorar seções <span aria-hidden>↓</span>
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
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      <section
        id="explore"
        className="relative bg-background border-t border-[#97979730]"
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-10">
          <Reveal>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-[#97979730] overflow-hidden bg-[#F7F7FB] shadow-sm hover:shadow-md transition-shadow">
                <div className="py-8 px-5 flex flex-col gap-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="text-lg text-main font-semibold tracking-wide">
                        Explorar
                      </span>
                      <div className="text-sm text-[#6F6C90] mt-1">
                        Acesse rapidamente as áreas principais da plataforma.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <NavCard
                      href="/jogos"
                      icon={<MdOutlineSportsVolleyball size={32} />}
                      title="Jogos"
                      desc="Acompanhe jogos e resultados"
                      active
                    />
                    <NavCard
                      href="/competicoes/tabelas"
                      icon={<GrTrophy size={27} />}
                      title="Competições"
                      desc="Acompanhe classificações e rankings"
                    />
                    <NavCard
                      href="/organizations"
                      icon={<LuBox size={32} />}
                      title="Organizações"
                      desc="Gerencie organizações e convites"
                    />
                    <NavCard
                      href="/comunidade/atletas"
                      icon={<FiUsers size={32} />}
                      title="Atletas"
                      desc="Comunidade e atletas"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#97979730] overflow-hidden bg-white">
                <div className="py-8 px-5 flex flex-col gap-4">
                  <span className="text-lg text-main font-semibold tracking-wide">
                    Acessos rápidos
                  </span>

                  <div className="flex flex-col gap-2">
                    <QuickItem
                      href="/organizations/invites"
                      icon={<IoMailOpenOutline size={18} />}
                      title="Convites recebidos"
                      desc="Convites para organizações"
                    />

                    <QuickItem
                      href="/jogos"
                      icon={<LuTv size={18} />}
                      title="Assistir ao vivo"
                      desc="Transmissões em tempo real"
                    />

                    <QuickItem
                      href="/jogos/proximos"
                      icon={<FaRegCalendarAlt size={16} />}
                      title="Próximos jogos"
                      desc="Calendário de partidas"
                    />

                    <QuickItem
                      href="/jogos/resultados"
                      icon={<BsGraphUp size={16} />}
                      title="Resultados"
                      desc="Histórico de resultados"
                    />

                    <QuickItem
                      href="/notifications"
                      icon={<MdNotificationsActive size={18} />}
                      title="Notificações"
                      desc="Atualizações e alertas"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
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

function NavCard({
  href,
  icon,
  title,
  desc,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 group text-left">
      <div
        className={[
          "rounded-xl size-14 shadow-lg flex items-center justify-center transition-all",
          active
            ? "bg-[#009C54] text-white"
            : "bg-white text-[#009C54] group-hover:scale-105",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="flex-1">
        <div className="flex items-center font-medium text-main text-xl">
          <span className={active ? "text-[#009C54]" : ""}>{title}</span>
          <span className="ml-2">
            <FaArrowRightLong
              className={[
                "transition-transform",
                active ? "translate-x-1 text-[#009C54]" : "",
              ].join(" ")}
            />
          </span>
        </div>
        <div className="text-sm text-[#6F6C90] mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function QuickItem({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 p-3 rounded-lg hover:bg-[#F7F7FB] transition-colors group"
    >
      <div className="mt-0.5 text-[#009C54]">{icon}</div>

      <div className="flex-1">
        <div className="font-medium text-main group-hover:text-[#009C54] transition-colors flex items-center gap-2">
          {title}
          <FaArrowRightLong className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" />
        </div>
        <div className="text-sm text-[#6F6C90]">{desc}</div>
      </div>
    </Link>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 will-change-transform",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
