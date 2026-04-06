"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LiveStatusBadge } from "./live-status-badge";
import type { LiveWithMatchData } from "@/types/combined";
import { TeamLogo } from "@/components/teams/team-logo";
import { Calendar, Play, CalendarPlus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseBackendIsoToDate } from "@/lib/datetime/parse-backend-iso";

interface LiveCardProps {
  live: LiveWithMatchData;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  onAddToCalendar?: () => void;
  isAddingToCalendar?: boolean;
  canAddToCalendar?: boolean;
  hasCalendarEvent?: boolean;
}

export function LiveCard({
  live,
  isSelected = false,
  onSelect,
  onAddToCalendar,
  isAddingToCalendar = false,
  canAddToCalendar = true,
  hasCalendarEvent = false,
}: LiveCardProps) {
  const { matchData } = live;

  const formatMatchDateTime = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = parseBackendIsoToDate(dateString); // ← aqui
      return {
        fullDate: format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      };
    } catch {
      return null;
    }
  };

  const matchDateTime = formatMatchDateTime(
    matchData?.scheduled_datetime
  );

  const hasScheduledDatetime = !!matchData?.scheduled_datetime;

  const hasMatchStarted = matchData?.scheduled_datetime
    ? parseBackendIsoToDate(matchData.scheduled_datetime) <= new Date() // ← aqui
    : false;

  const canActuallyAddToCalendar = canAddToCalendar && hasScheduledDatetime && !hasMatchStarted;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onSelect && canAddToCalendar && hasScheduledDatetime && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(checked === true)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {matchData?.competition_name || `Live #${live.id.slice(0, 8)}`}
              </h3>
              {hasCalendarEvent && (
                <span title="Este jogo já foi adicionado ao seu Google Calendar" aria-label="Já adicionado ao Google Calendar">
                  <Calendar className="w-4 h-4 text-green-600" />
                </span>
              )}
            </div>
          </div>
          <LiveStatusBadge status={live.status} />
        </div>

      </CardHeader>

      <CardContent className="space-y-3 flex-1 my-4 min-w-0 overflow-hidden">
        {matchData?.home_team && matchData?.away_team ? (
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-2 items-center">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo
                name={matchData.home_team.name}
                abbreviation={matchData.home_team.abbreviation || "?"}
                logoUrl={
                  matchData.home_team.logo_url ??
                  matchData.home_team.logo ??
                  null
                }
                className="h-8 w-8 shrink-0"
                textClassName="text-[10px]"
              />
              <span className="min-w-0 font-semibold text-sm truncate" title={matchData.home_team.name}>
                {matchData.home_team.name}
              </span>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-2 px-1 tabular-nums">
              {(live.status === "live" || live.status === "finished") && (
                <span className="font-bold text-lg leading-none">{matchData.home_score}</span>
              )}
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                VS
              </span>
              {(live.status === "live" || live.status === "finished") && (
                <span className="font-bold text-lg leading-none">{matchData.away_score}</span>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2">
              <span
                className="min-w-0 font-semibold text-sm truncate text-right"
                title={matchData.away_team.name}
              >
                {matchData.away_team.name}
              </span>
              <TeamLogo
                name={matchData.away_team.name}
                abbreviation={matchData.away_team.abbreviation || "?"}
                logoUrl={
                  matchData.away_team.logo_url ??
                  matchData.away_team.logo ??
                  null
                }
                className="h-8 w-8 shrink-0"
                textClassName="text-[10px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 min-h-5">
              <span className="text-muted-foreground min-w-24 shrink-0">Partida:</span>
              <span className="font-medium break-all line-clamp-2">{live.externalMatchId}</span>
            </div>
            <div className="flex items-start gap-2 min-h-5">
              <span className="text-muted-foreground min-w-24 shrink-0">Organização:</span>
              <span className="font-medium break-all line-clamp-2">{live.organizationId}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-1.5">
        <div className="flex flex-col gap-2 justify-between w-full mb-3">
          <div className="w-full flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">
              {matchDateTime
                ? matchDateTime.fullDate
                : "Horário não definido"
              }
            </span>
          </div>
          {matchData?.home_team && matchData?.away_team && matchData.local && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="truncate text-md">{matchData.local}</span>
            </div>
          )}
        </div>
        <div className="w-full flex gap-2">
      {onAddToCalendar && canAddToCalendar && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCalendar();
              }}
        disabled={isAddingToCalendar || !canActuallyAddToCalendar}
              className="gap-2 flex-1"
              variant="outline"
              title={
                hasCalendarEvent
                  ? "Este jogo já está no seu calendário"
                  : !hasScheduledDatetime
                  ? "Horário não definido"
                  : hasMatchStarted
                  ? "Este jogo já começou"
                  : "Adicionar ao Google Calendar"
              }
            >
              <CalendarPlus className="w-4 h-4" />
              Calendário
            </Button>
          )}
          {onAddToCalendar && !canAddToCalendar && (
            <Button
              disabled
              className="gap-2 flex-1"
              variant="outline"
              title="Apenas lives agendadas podem ser adicionadas ao calendário"
            >
              <CalendarPlus className="w-4 h-4" />
              Calendário
            </Button>
          )}
          <Link href={`/jogos/${live.id}`} className={onAddToCalendar && canAddToCalendar ? "flex-1" : "w-full"}>
            <Button className="w-full gap-2 cursor-pointer bg-main hover:bg-main/90 text-white">
              <Play className="w-4 h-4" />
              Acessar
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}