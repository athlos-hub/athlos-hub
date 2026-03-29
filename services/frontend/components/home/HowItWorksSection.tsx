"use client";

import Link from "next/link";
import { CalendarRange, LineChart, Radio } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const profiles = [
  {
    key: "organizers",
    title: "Organizadores",
    headline: "Monte o torneio completo",
    benefits: [
      "Crie competições e convide equipes",
      "Defina fases, chaves e calendário",
      "Gerencie inscrições e comunicação",
    ],
    icon: CalendarRange,
    cta: { href: "/organizations", label: "Abrir organizações" },
  },
  {
    key: "athletes",
    title: "Atletas e clubes",
    headline: "Jogue e acompanhe sua evolução",
    benefits: [
      "Inscrição e vínculo com o seu time",
      "Estatísticas e histórico de jogos",
      "Perfil público para a comunidade",
    ],
    icon: LineChart,
    cta: { href: "/auth/cadastro", label: "Criar perfil" },
  },
  {
    key: "spectators",
    title: "Espectadores",
    headline: "Siga tudo em tempo real",
    benefits: [
      "Placar e status ao vivo",
      "Transmissões e agenda de jogos",
      "Feed social da competição",
    ],
    icon: Radio,
    cta: { href: "/jogos", label: "Ver jogos" },
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      className="border-b border-border py-16"
      aria-labelledby="home-how-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <h2
          id="home-how-heading"
          className="text-3xl font-bold tracking-tight text-foreground"
        >
          Para cada parte do esporte
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ferramentas pensadas para quem organiza, quem compete e quem torce.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {profiles.map((p) => {
            const Icon = p.icon;
            return (
              <Card
                key={p.key}
                className="flex flex-col border-border transition-all hover:-translate-y-0.5 hover:border-main/40 hover:shadow-md"
              >
                <CardHeader>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-main/10 text-main">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.title}
                  </p>
                  <CardTitle className="text-xl">{p.headline}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-main" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link
                    href={p.cta.href}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full"
                    )}
                  >
                    {p.cta.label}
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
