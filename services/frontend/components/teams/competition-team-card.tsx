"use client";

import Link from "next/link";
import { ArrowUpRight, Shield, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TeamWithPlayers } from "@/types/competition";
import { TeamLogo } from "@/components/teams/team-logo";
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
  const profileTeamId = team.auth_team_id?.trim() || team.id;
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
          href={`/clubes/${profileTeamId}`}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-main"
        >
          <TeamLogo
            name={team.name}
            abbreviation={team.abbreviation}
            logoUrl={team.logo_url}
            className="h-14 w-14"
            textClassName="text-base"
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-main sm:text-lg">
                {team.name}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">{team.abbreviation}</p>
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70"
                aria-hidden
              />
            </div>
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
