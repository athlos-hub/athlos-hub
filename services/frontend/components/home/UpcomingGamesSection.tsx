"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HomeUpcomingGame } from "@/types/home-page";
import { cn } from "@/lib/utils";

function UpcomingRow({ game }: { game: HomeUpcomingGame }) {
  const when = new Date(game.startsAt);
  return (
    <div className="flex flex-col gap-4 border-b border-border py-5 last:border-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground sm:w-44 shrink-0">
        <CalendarClock className="size-4 shrink-0 text-main" aria-hidden />
        <time dateTime={game.startsAt}>
          {format(when, "EEE dd/MM · HH:mm", { locale: ptBR })}
        </time>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4">
        <p className="w-full text-xs text-muted-foreground sm:hidden">
          {game.competition.name} · Fase:{" "}
          {game.competition.phaseLabel ?? game.competition.modality}
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-end">
          <span className="truncate text-right text-sm font-medium">
            {game.homeTeam.name}
          </span>
          <Avatar className="size-9 border border-border">
            {game.homeTeam.crestUrl ? (
              <AvatarImage src={game.homeTeam.crestUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {game.homeTeam.shortName}
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">vs</span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar className="size-9 border border-border">
            {game.awayTeam.crestUrl ? (
              <AvatarImage src={game.awayTeam.crestUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {game.awayTeam.shortName}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{game.awayTeam.name}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <div className="hidden text-xs text-muted-foreground sm:block sm:text-right">
          <p className="font-medium text-foreground">{game.competition.name}</p>
          <p>
            Fase: {game.competition.phaseLabel ?? game.competition.modality}
          </p>
        </div>
        <Link
          href={game.competitionHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ver competição
        </Link>
      </div>
    </div>
  );
}

export interface UpcomingGamesSectionProps {
  initialGames: HomeUpcomingGame[];
}

export function UpcomingGamesSection({ initialGames }: UpcomingGamesSectionProps) {
  const games = initialGames;

  return (
    <section
      className="border-b border-border bg-background py-16"
      aria-labelledby="home-upcoming-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="home-upcoming-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              Próximos jogos
            </h2>
            <p className="mt-1 text-muted-foreground">
              Partidas agendadas nas próximas semanas
            </p>
          </div>
          <Link
            href="/jogos"
            className={cn(buttonVariants({ variant: "ghost" }), "text-main")}
          >
            Ver calendário completo
          </Link>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0 px-4 sm:px-6">
            {games.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum jogo agendado por enquanto.{" "}
                <Link
                  href="/jogos"
                  className="font-medium text-main underline-offset-4 hover:underline"
                >
                  Abrir jogos
                </Link>
              </div>
            ) : (
              games.map((game) => <UpcomingRow key={game.id} game={game} />)
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
