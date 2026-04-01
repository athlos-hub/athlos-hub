"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Radio, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getMatchById } from "@/actions/matches";
import { listLives } from "@/actions/lives";
import { ScoreboardDisplay } from "@/components/matches/scoreboard-display";
import type { MatchDetail } from "@/types/match";
import type { Live } from "@/types/livestream";
import { LiveStatus } from "@/types/livestream";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

function matchStatusLabel(status: string): string {
  const s = status?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    scheduled: "Agendado",
    pending: "Agendado",
    live: "Ao vivo",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };
  return map[s] || "Status não definido";
}

export default function PartidaPage() {
  const params = useParams();
  const matchId = params?.matchId as string;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [lives, setLives] = useState<Live[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    async function load() {
      setIsLoading(true);
      try {
        const [matchData, livesData] = await Promise.all([
          getMatchById(matchId),
          listLives({ externalMatchId: matchId }).catch(() => [] as Live[]),
        ]);
        setMatch(matchData);
        setLives(Array.isArray(livesData) ? livesData : []);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar a partida");
        setMatch(null);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [matchId]);

  const primaryLive =
    lives.find((l) => l.status === LiveStatus.LIVE) ||
    lives.find((l) => l.status === LiveStatus.SCHEDULED) ||
    lives[0];

  if (isLoading) {
    return (
      <div className="space-y-6 py-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-muted-foreground">Partida não encontrada</p>
        <Link href="/jogos">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos jogos
          </Button>
        </Link>
      </div>
    );
  }

  const scheduled = match.scheduled_datetime
    ? format(new Date(match.scheduled_datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="space-y-8 py-6 max-w-4xl mx-auto">
      <PageHeader
        title={`${match.home_team?.name ?? "Time mandante"} × ${match.away_team?.name ?? "Time visitante"}`}
        subtitle={match.competition_name ? `${match.competition_name}` : undefined}
        actions={
          <>
            <Link href={`/competitions/${match.competition_id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Competição
              </Button>
            </Link>
            <Link href="/jogos">
              <Button variant="ghost" size="sm">
                Jogos e transmissões
              </Button>
            </Link>
          </>
        }
      />

      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="secondary">{matchStatusLabel(match.status)}</Badge>
          {match.round_name && (
            <span className="text-sm text-muted-foreground">{match.round_name}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {scheduled && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{scheduled}</span>
            </div>
          )}
          {match.local && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{match.local}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {primaryLive && (
        <Card className="border-main/30 bg-main/5">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-main font-medium">
              <Radio className="w-5 h-5" />
              {primaryLive.status === LiveStatus.LIVE
                ? "Transmissão ao vivo disponível"
                : "Transmissão vinculada a esta partida"}
            </div>
            <Link href={`/jogos/${primaryLive.id}`}>
              <Button className="bg-main hover:bg-main/90 text-white">
                {primaryLive.status === LiveStatus.LIVE ? "Assistir agora" : "Abrir transmissão"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Placar</h2>
        <ScoreboardDisplay
          matchId={match.id}
          competitionId={match.competition_id}
          canEdit={false}
          liveId={primaryLive?.id}
        />
      </div>
    </div>
  );
}
