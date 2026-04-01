"use client";

import { useScoreboard } from "@/hooks/use-scoreboard";
import type { Scoreboard as ScoreboardType } from "@/types/scoreboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Radio, Clock, CheckCircle2, XCircle } from "lucide-react";
import { ScoreEditor } from "./score-editor";
import { TeamLogo } from "@/components/teams/team-logo";

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

export function ScoreboardDisplay({ matchId, competitionId, canEdit = false, liveId }: ScoreboardDisplayProps) {
  const { scoreboard, isConnected, error } = useScoreboard(matchId);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Erro no Placar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!scoreboard) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      {/* Indicador de conexão */}
      <div className="absolute top-4 right-4">
        {isConnected ? (
          <Badge variant="outline" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
            <Radio className="w-3 h-3 animate-pulse" />
            Ao vivo
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5">
            <Clock className="w-3 h-3" />
            Offline
          </Badge>
        )}
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Placar
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Placar Principal */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          {/* Time da Casa */}
          <div className="text-right space-y-2 flex flex-col items-end">
            <div className="flex items-center justify-end gap-2 min-w-0">
              <div className="min-w-0">
                <p className="font-semibold text-lg truncate">
                  {scoreboard.home_team_name || "Time A"}
                </p>
              </div>
              <TeamLogo
                name={scoreboard.home_team_name || "Time A"}
                abbreviation={abbrFromTeamName(scoreboard.home_team_name)}
                logoUrl={null}
                className="h-10 w-10 shrink-0"
                textClassName="text-xs"
              />
            </div>
            <p className="text-5xl font-bold text-primary">
              {scoreboard.home_total_score}
            </p>
          </div>

          {/* Separador */}
          <div className="text-3xl font-bold text-muted-foreground">
            ×
          </div>

          {/* Time Visitante */}
          <div className="text-left space-y-2 flex flex-col items-start">
            <div className="flex items-center justify-start gap-2 min-w-0">
              <TeamLogo
                name={scoreboard.away_team_name || "Time B"}
                abbreviation={abbrFromTeamName(scoreboard.away_team_name)}
                logoUrl={null}
                className="h-10 w-10 shrink-0"
                textClassName="text-xs"
              />
              <div className="min-w-0">
                <p className="font-semibold text-lg truncate">
                  {scoreboard.away_team_name || "Time B"}
                </p>
              </div>
            </div>
            <p className="text-5xl font-bold text-primary">
              {scoreboard.away_total_score}
            </p>
          </div>
        </div>

        {/* Segments (Tempos/Períodos) */}
        {scoreboard.segments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                Detalhamento
              </h4>
            </div>

            <div className="space-y-2">
              {scoreboard.segments.map((segment) => (
                <div
                  key={segment.segment_number}
                  className={`grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-center p-3 rounded-lg border transition-colors ${
                    segment.finished
                      ? "bg-muted/50 border-muted"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  {/* Casa - Segment */}
                  <div className="text-right">
                    <span className="text-2xl font-bold">
                      {segment.home_score}
                    </span>
                  </div>

                  {/* Nome do Segment */}
                  <div className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getSegmentLabel(segment.segment_number, segment.segment_type)}
                      </span>
                      {segment.finished && (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Visitante - Segment */}
                  <div className="text-left">
                    <span className="text-2xl font-bold">
                      {segment.away_score}
                    </span>
                  </div>

                  {/* Botão de Edição */}
                  {canEdit && (
                    <div className="flex justify-center">
                      <ScoreEditor
                        matchId={matchId}
                        segment={segment}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status da Partida */}
        <div className="pt-4 border-t">
          <StatusBadge status={scoreboard.status} />
        </div>
      </CardContent>
    </Card>
  );
}

function getSegmentLabel(number: number, type: string): string {
  if (type === "PENALTY") return "Pênaltis";
  if (type === "OVERTIME") return `Prorrogação ${number}`;
  return `${number}º Tempo`;
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { label: "Pendente", variant: "secondary" as const },
    scheduled: { label: "Agendada", variant: "outline" as const },
    live: { label: "Ao Vivo", variant: "default" as const },
    finished: { label: "Finalizada", variant: "secondary" as const },
    canceled: { label: "Cancelada", variant: "destructive" as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-sm text-muted-foreground">Status:</span>
      <Badge variant={config.variant}>{config.label}</Badge>
    </div>
  );
}
