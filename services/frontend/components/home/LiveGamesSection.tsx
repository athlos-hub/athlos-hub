"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HomeLiveGame } from "@/types/home-page";
import { cn } from "@/lib/utils";

function LiveGameCard({ game }: { game: HomeLiveGame }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {game.competition.modality}
        </p>
        <p className="line-clamp-2 text-lg font-semibold leading-tight text-foreground">
          {game.competition.name}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="size-10 border border-border">
              {game.homeTeam.crestUrl ? (
                <AvatarImage src={game.homeTeam.crestUrl} alt="" />
              ) : null}
              <AvatarFallback className="bg-muted text-xs font-semibold">
                {game.homeTeam.shortName}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{game.homeTeam.name}</span>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {game.homeScore}
              <span className="mx-1 text-muted-foreground">:</span>
              {game.awayScore}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-medium">
              {game.awayTeam.name}
            </span>
            <Avatar className="size-10 border border-border">
              {game.awayTeam.crestUrl ? (
                <AvatarImage src={game.awayTeam.crestUrl} alt="" />
              ) : null}
              <AvatarFallback className="bg-muted text-xs font-semibold">
                {game.awayTeam.shortName}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{game.statusLabel}</p>
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href={game.detailHref}
          className={cn(
            buttonVariants(),
            "w-full bg-main text-white hover:bg-main/90"
          )}
        >
          Assistir
        </Link>
      </CardFooter>
    </Card>
  );
}

export interface LiveGamesSectionProps {
  initialGames: HomeLiveGame[];
}

export function LiveGamesSection({ initialGames }: LiveGamesSectionProps) {
  const games = initialGames;

  return (
    <section
      className="border-b border-border bg-background py-16"
      aria-labelledby="home-live-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-center gap-3">
          <h2
            id="home-live-heading"
            className="text-3xl font-bold tracking-tight text-foreground"
          >
            Acontecendo agora
          </h2>
          {games.length > 0 ? (
            <Badge
              variant="destructive"
              className={cn(
                "gap-1.5 uppercase",
                "motion-safe:animate-pulse motion-reduce:animate-none"
              )}
            >
              <Radio className="size-3" aria-hidden />
              AO VIVO
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 uppercase">
              <Radio className="size-3 opacity-70" aria-hidden />
              Sem jogos ao vivo
            </Badge>
          )}
        </div>

        {games.length === 0 ? (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Radio className="size-7" aria-hidden />
              </div>
              <div className="max-w-lg space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  Nenhuma partida ao vivo no momento
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Quando houver transmissões ou jogos em andamento, elas
                  aparecem aqui. Enquanto isso, explore a agenda ou as
                  competições públicas.
                </p>
              </div>
              <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                  href="/jogos"
                  className={cn(
                    buttonVariants(),
                    "w-full bg-main text-white hover:bg-main/90 sm:w-auto"
                  )}
                >
                  Ver agenda de jogos
                </Link>
                <Link
                  href="/competitions"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full sm:w-auto"
                  )}
                >
                  Explorar competições
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {games.map((game) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
