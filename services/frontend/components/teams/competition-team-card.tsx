"use client";

import Link from "next/link";
import { ArrowUpRight, Shield, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TeamWithPlayers } from "@/types/competition";
import { cn } from "@/lib/utils";

export interface CompetitionTeamCardProps {
  team: TeamWithPlayers;
  organizationSlug?: string;
  organizationName?: string;
}

/**
 * Card de equipe na competição: links para perfil do time e da organização.
 */
export function CompetitionTeamCard({
  team,
  organizationSlug,
  organizationName,
}: CompetitionTeamCardProps) {
  const playerCount = team.players?.length ?? 0;
  const orgLabel =
    organizationName?.trim() ||
    (organizationSlug
      ? organizationSlug.replace(/-/g, " ")
      : null);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/80 bg-card p-0 transition-all",
        "hover:border-main/35 hover:shadow-md"
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-main/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/clubes/${team.id}`}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-main"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-main/10 text-sm font-bold uppercase tracking-tight text-main ring-1 ring-main/20">
            {team.abbreviation.slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-main sm:text-lg">
                {team.name}
              </h3>
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70"
                aria-hidden
              />
            </div>
            <p className="text-sm text-muted-foreground">{team.abbreviation}</p>
          </div>
        </Link>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border pt-3 sm:min-w-[140px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
            <Users className="size-4 shrink-0 text-main/70" aria-hidden />
            <span>
              {playerCount} jogador{playerCount !== 1 ? "es" : ""}
            </span>
          </div>
          {organizationSlug && orgLabel && (
            <Link
              href={`/organizations/${organizationSlug}`}
              className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-main hover:underline"
            >
              <Shield className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{orgLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
