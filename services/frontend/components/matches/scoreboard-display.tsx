"use client";

import { useScoreboard } from "@/hooks/use-scoreboard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Clock, XCircle } from "lucide-react";
import { TeamLogo } from "@/components/teams/team-logo";
import { ScoreboardEditDialog } from "./scoreboard-edit-dialog";
import { RiH3 } from "react-icons/ri";

function abbrFromTeamName(name: string | null | undefined): string {
  const t = (name || "").trim();
  if (!t) return "?";
  const p = t.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return t.slice(0, 3).toUpperCase();
}

interface ScoreboardDisplayProps {
  matchId: string;
  competitionId?: string;
  canEdit?: boolean;
  liveId?: string;
}

export function ScoreboardDisplay({ matchId, canEdit = false }: ScoreboardDisplayProps) {
  const { scoreboard, isConnected, error, reconnect } = useScoreboard(matchId);

  if (error && !scoreboard) {
    return (
      <Card className="border-destructive/40 shadow-sm">
        <CardContent className="flex items-start gap-3 p-4 pt-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Placar indisponível</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              className="text-xs text-main underline underline-offset-2"
              onClick={() => reconnect()}
            >
              Tentar novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreboard) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-[7.5rem] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              Placar
            </h3>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Radio className="h-3 w-3 shrink-0 animate-pulse" aria-hidden />
                Ao vivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                Tempo real off
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {canEdit && scoreboard.segments.length > 0 && (
              <ScoreboardEditDialog
                matchId={matchId}
                segments={scoreboard.segments}
                canEdit={canEdit}
              />
            )}
            
          </div>
        </div>

        <div className="bg-muted/35 px-3 py-5 sm:px-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                  {scoreboard.home_team_name || "Time A"}
                </p>
              </div>
              <TeamLogo
                name={scoreboard.home_team_name || "Time A"}
                abbreviation={abbrFromTeamName(scoreboard.home_team_name)}
                logoUrl={scoreboard.home_team_logo_url ?? null}
                className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
                textClassName="text-xs"
              />
            </div>

            <div className="flex shrink-0 items-baseline gap-2 px-1 tabular-nums sm:gap-3">
              <span className="min-w-[2ch] text-center text-3xl font-bold tracking-tight text-main sm:text-4xl sm:min-w-[2.5ch]">
                {scoreboard.home_total_score}
              </span>
              <span className="text-lg font-light text-muted-foreground sm:text-xl" aria-hidden>
                ×
              </span>
              <span className="min-w-[2ch] text-center text-3xl font-bold tracking-tight text-main sm:text-4xl sm:min-w-[2.5ch]">
                {scoreboard.away_total_score}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3">
              <TeamLogo
                name={scoreboard.away_team_name || "Time B"}
                abbreviation={abbrFromTeamName(scoreboard.away_team_name)}
                logoUrl={scoreboard.away_team_logo_url ?? null}
                className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
                textClassName="text-xs"
              />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                  {scoreboard.away_team_name || "Time B"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
