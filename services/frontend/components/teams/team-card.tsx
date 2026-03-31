"use client";

import Link from "next/link";
import { TeamListItem, TeamRole } from "@/types/team";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Trophy, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: TeamListItem;
  /** Exibe distintivo capitão/jogador */
  showRole?: boolean;
  /** Oculta status (ex.: painel só com equipes ativas na competição) */
  hideStatus?: boolean;
}

export function TeamCard({ team, showRole = true, hideStatus = false }: TeamCardProps) {
  const getRoleBadge = (role: TeamRole) => {
    const roleConfig = {
      [TeamRole.CAPTAIN]: { label: "Capitão", variant: "default" as const, icon: Shield },
      [TeamRole.PLAYER]: { label: "Jogador", variant: "outline" as const, icon: Users },
    };
    return roleConfig[role] || { label: role, variant: "outline" as const, icon: Users };
  };

  const roleConfig = team.role ? getRoleBadge(team.role) : null;
  const RoleIcon = roleConfig?.icon;

  if (hideStatus) {
    return (
      <div
        className={cn(
          "group overflow-hidden rounded-xl border border-gray-200 bg-card transition-all",
          "hover:border-main/35 hover:shadow-md"
        )}
      >
        <Link href={`/clubes/${team.id}`} className="block p-5 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-main to-main/85 text-base font-bold text-white shadow-sm ring-1 ring-main/20">
              <span className="leading-none">{team.abbreviation}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-main transition-colors">
                {team.name}
              </h3>
              {team.competition_name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 shrink-0 text-main/80" />
                  <span className="truncate">{team.competition_name}</span>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {team.player_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {team.player_count} jogador{team.player_count !== 1 ? "es" : ""}
                  </span>
                )}
                {showRole && roleConfig && RoleIcon && (
                  <Badge variant={roleConfig.variant} className="gap-1 text-xs">
                    <RoleIcon className="h-3 w-3" />
                    {roleConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Link>

        {team.organization_name && team.organization_slug && (
          <div className="border-t bg-muted/40 px-5 py-3">
            <Link
              href={`/organizations/${team.organization_slug}`}
              className="flex items-center gap-3 min-w-0 text-sm font-medium text-gray-900 hover:text-main transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-main/15 bg-main/10">
                <Building2 className="h-4 w-4 text-main" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Organização</p>
                <p className="truncate">{team.organization_name}</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/80 bg-card transition-all",
        "hover:border-main/35 hover:shadow-md"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-main/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link
            href={`/clubes/${team.id}`}
            className="flex min-w-0 flex-1 gap-4 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-main"
          >
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-main to-main/80 text-lg font-bold text-white shadow-inner ring-1 ring-main/25">
              <span className="leading-none">{team.abbreviation}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-main">
                {team.name}
              </h3>

              {team.competition_name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="size-4 shrink-0 text-main/80" />
                  <span className="truncate">{team.competition_name}</span>
                </div>
              )}
            </div>
          </Link>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            {team.player_count !== undefined && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                <Users className="size-3.5 shrink-0" />
                <span>
                  {team.player_count} jogador{team.player_count !== 1 ? "es" : ""}
                </span>
              </div>
            )}

            {showRole && roleConfig && RoleIcon && (
              <Badge variant={roleConfig.variant} className="gap-1">
                <RoleIcon className="size-3" />
                {roleConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {team.organization_name && team.organization_slug && (
          <Link
            href={`/organizations/${team.organization_slug}`}
            className="inline-flex max-w-full items-center gap-2 rounded-md text-sm font-medium text-main transition-colors hover:underline"
          >
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{team.organization_name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
