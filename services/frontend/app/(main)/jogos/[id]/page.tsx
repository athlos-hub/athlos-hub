"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LivePlayer } from "@/components/livestream/live-player";
import { LiveChat } from "@/components/livestream/live-chat";
import { LiveEvents } from "@/components/livestream/live-events";
import { LiveStatusDisplay } from "@/components/livestream/live-status-display";
import { StreamKeyDisplay } from "@/components/livestream/stream-key-display";
import { ScoreboardDisplay } from "@/components/matches/scoreboard-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getLiveById,
  finishLive,
  cancelLive,
  patchLiveTransmitVideo,
  startMatchWithoutStream,
} from "@/actions/lives";
import { getMatchById, updateMatch } from "@/actions/matches";
import { getMyOrganizations } from "@/actions/organizations";
import { getCompetitionStats, getCompetitionTeamsWithPlayers } from "@/actions/competitions";
import { OrgRole } from "@/types/organization";
import { useLiveStatus } from "@/hooks/use-live-status";
import { useScoreboard } from "@/hooks/use-scoreboard";
import type { Live } from "@/types/livestream";
import type { MatchDetail } from "@/types/match";
import type { CompetitionStat, TeamWithPlayers } from "@/types/competition";
import { toast } from "sonner";
import { ArrowLeft, Play, Square, Video, X } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { phaseLabelFromMatch } from "@/lib/home/map-home-data";

export default function LiveDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [initialLive, setInitialLive] = useState<Live | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetail | null>(null);
  const [competitionStats, setCompetitionStats] = useState<CompetitionStat[]>([]);
  const [teamsWithPlayers, setTeamsWithPlayers] = useState<TeamWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showTransmitDialog, setShowTransmitDialog] = useState(false);
  const [transmitDraft, setTransmitDraft] = useState(true);

  const liveId = params?.id as string;

  const { live, updateLive } = useLiveStatus(liveId, initialLive);
  
  // Hook do scoreboard para obter os segments
  const { scoreboard } = useScoreboard(live?.externalMatchId || null);

  useEffect(() => {
    async function loadLive() {
      if (!liveId) return;

      try {
        const data = await getLiveById(liveId);
        setInitialLive(data);
        updateLive(data);
        
        // Carrega detalhes do match para obter competition_id
        if (data.externalMatchId) {
          try {
            const matchData = await getMatchById(data.externalMatchId);
            setMatchDetails(matchData);
            
            // Carrega as estatísticas da competição
            if (matchData.competition_id) {
              try {
                const stats = await getCompetitionStats(matchData.competition_id);
                setCompetitionStats(stats);
              } catch (statsErr) {
                console.error("Erro ao carregar estatísticas da competição:", statsErr);
              }
              
              // Carrega os times com jogadores
              try {
                const teams = await getCompetitionTeamsWithPlayers(matchData.competition_id);
                setTeamsWithPlayers(teams);
              } catch (teamsErr) {
                console.error("Erro ao carregar times com jogadores:", teamsErr);
              }
            }
          } catch (matchErr) {
            console.error("Erro ao carregar detalhes do match:", matchErr);
          }
        }
        
        try {
          const myOrgs = await getMyOrganizations();
          const match = myOrgs.find((o: any) => o.id === data.organizationId);
          setUserOrgRole(match?.role ?? null);
        } catch (err) {
          setUserOrgRole(null);
        }
      } catch (error) {
        console.error("Erro ao carregar live:", error);
        toast.error("Erro ao carregar live");
      } finally {
        setIsLoading(false);
      }
    }

    loadLive();
  }, [liveId]);

  const handleFinish = async () => {
    if (!liveId || isUpdating) return;

    setIsUpdating(true);
    try {
      const updatedLive = await finishLive(liveId);
      updateLive(updatedLive);
      if (updatedLive.externalMatchId) {
        try {
          const m = await getMatchById(updatedLive.externalMatchId);
          setMatchDetails(m);
        } catch {
          /* placar/status podem atualizar após o consumidor RabbitMQ */
        }
      }
      toast.success(
        "Transmissão encerrada."
      );
    } catch (error) {
      console.error("Erro ao finalizar live:", error);
      toast.error("Erro ao encerrar a transmissão");
    } finally {
      setIsUpdating(false);
      setShowFinishDialog(false);
    }
  };

  const handleCancel = async () => {
    if (!liveId || isUpdating) return;

    setIsUpdating(true);
    try {
      const updatedLive = await cancelLive(liveId);
      updateLive(updatedLive);
      toast.success("Live cancelada com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar live:", error);
      toast.error("Erro ao cancelar live");
    } finally {
      setIsUpdating(false);
      setShowCancelDialog(false);
    }
  };

  const handleSaveTransmit = async () => {
    if (!liveId || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await patchLiveTransmitVideo(liveId, transmitDraft);
      updateLive(updated);
      if (live?.externalMatchId) {
        await updateMatch(live.externalMatchId, { transmitVideo: transmitDraft });
        const m = await getMatchById(live.externalMatchId);
        setMatchDetails(m);
      }
      toast.success("Preferência de transmissão atualizada.");
      setShowTransmitDialog(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartWithoutStream = async () => {
    if (!liveId || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await startMatchWithoutStream(liveId);
      updateLive(updated);
      if (live?.externalMatchId) {
        const m = await getMatchById(live.externalMatchId);
        setMatchDetails(m);
      }
      toast.success("Partida iniciada.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar partida");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">Live não encontrada</p>
        <Link href="/jogos">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const wantsVideo = live.transmitVideo !== false;
  const canManage = userOrgRole === OrgRole.OWNER || userOrgRole === OrgRole.ORGANIZER;
  const canEditTransmitBeforeStart = canManage && live.status === "scheduled";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Transmissão do jogo"
          subtitle={
            wantsVideo
              ? "Assista à transmissão e acompanhe o andamento da partida."
              : "Acompanhe o jogo ao vivo."
          }
        />

        <div className="flex items-center gap-2">
          {canEditTransmitBeforeStart && (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isUpdating}
                onClick={() => {
                  setTransmitDraft(wantsVideo);
                  setShowTransmitDialog(true);
                }}
              >
                <Video className="w-4 h-4" />
                Modo de transmissão
              </Button>
              <Button
                onClick={() => setShowCancelDialog(true)}
                disabled={isUpdating}
                variant="destructive"
                className="gap-2 text-white"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </>
          )}

          {canManage && live.status === "live" && (
            <Button
              onClick={() => setShowFinishDialog(true)}
              disabled={isUpdating}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Encerrar transmissão
            </Button>
          )}
        </div>
      </div>

      <LiveStatusDisplay 
        status={live.status}
        startedAt={live.startedAt}
        endedAt={live.endedAt}
      />

      {matchDetails && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {matchDetails.competition_name && (
            <Link
              href={`/competitions/${matchDetails.competition_id}`}
              className="font-medium text-foreground hover:underline"
            >
              {matchDetails.competition_name}
            </Link>
          )}
          <Badge variant="secondary" className="font-normal">
            {phaseLabelFromMatch(matchDetails)}
          </Badge>
        </div>
      )}

      {canManage && wantsVideo && (live.status === "scheduled" || live.status === "live") && (
        <StreamKeyDisplay streamKey={live.streamKey} />
      )}

      {/* Placar em Tempo Real */}
      {live.externalMatchId && (
        <ScoreboardDisplay 
          matchId={live.externalMatchId}
          competitionId={matchDetails?.competition_id}
          canEdit={(userOrgRole === OrgRole.OWNER) || (userOrgRole === OrgRole.ORGANIZER)}
          liveId={liveId}
        />
      )}

      {wantsVideo ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[720px] min-h-[400px]">
              <LivePlayer live={live} />
            </div>

            <div className="lg:col-span-1 h-[720px] min-h-[400px] flex flex-col min-h-0">
              <LiveChat
                liveId={liveId}
                userId={session?.user?.id || null}
                userName={session?.user?.name || null}
                isAuthenticated={!!session?.user}
                liveStatus={live.status}
              />
            </div>
          </div>

          <LiveEvents
            liveId={liveId}
            liveStatus={live.status}
            matchId={live.externalMatchId || ""}
            matchData={{
              home_team_id: matchDetails?.home_team?.id,
              away_team_id: matchDetails?.away_team?.id,
            }}
            competitionId={matchDetails?.competition_id}
            competitionStats={competitionStats}
            teamsWithPlayers={teamsWithPlayers}
            segments={scoreboard?.segments || []}
            canCreateEvents={canManage}
          />
        </>
      ) : (
        <>
          {canEditTransmitBeforeStart && (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Sem transmissão de vídeo</p>
                  <p className="text-sm text-muted-foreground">
                    Inicie a partida quando estiver pronto.
                  </p>
                </div>
                <Button
                  type="button"
                  className="shrink-0 gap-2 bg-main hover:bg-main/90 text-white"
                  disabled={isUpdating}
                  onClick={handleStartWithoutStream}
                >
                  <Play className="w-4 h-4" />
                  Iniciar partida
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:h-[720px]">
            <div className="flex min-h-[420px] flex-col lg:h-full lg:min-h-0">
              <LiveEvents
                liveId={liveId}
                liveStatus={live.status}
                matchId={live.externalMatchId || ""}
                matchData={{
                  home_team_id: matchDetails?.home_team?.id,
                  away_team_id: matchDetails?.away_team?.id,
                }}
                competitionId={matchDetails?.competition_id}
                competitionStats={competitionStats}
                teamsWithPlayers={teamsWithPlayers}
                segments={scoreboard?.segments || []}
                canCreateEvents={canManage}
              />
            </div>
            <div className="flex min-h-[420px] flex-col lg:h-full lg:min-h-0">
              <LiveChat
                liveId={liveId}
                userId={session?.user?.id || null}
                userName={session?.user?.name || null}
                isAuthenticated={!!session?.user}
                liveStatus={live.status}
              />
            </div>
          </div>
        </>
      )}

      <Dialog open={showTransmitDialog} onOpenChange={setShowTransmitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transmissão de vídeo</DialogTitle>
            <DialogDescription>
              Defina o modo de transmissão para o jogo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 px-3 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="transmit-live" className="text-sm font-medium">
                Transmitir em vídeo
              </Label>
              <p className="text-xs text-muted-foreground">
                Desligue para ocultar o player e usar só placar ao vivo, chat e eventos.
              </p>
            </div>
            <Switch
              id="transmit-live"
              checked={transmitDraft}
              onCheckedChange={setTransmitDraft}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowTransmitDialog(false)} disabled={isUpdating}>
              Voltar
            </Button>
            <Button
              type="button"
              className="bg-main hover:bg-main/90 text-white"
              disabled={isUpdating}
              onClick={() => void handleSaveTransmit()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar transmissão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Tem certeza que deseja <strong>encerrar</strong> esta transmissão?</p>
                <div>
                  <span>Isso irá:</span>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Encerrar a live e desconectar espectadores</li>
                    <li>Notificar o serviço de competições para finalizar o jogo (placar e classificação)</li>
                  </ul>
                </div>
                <p className="font-semibold text-destructive">Esta ação NÃO pode ser desfeita!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinish}
              disabled={isUpdating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUpdating ? "Encerrando..." : "Encerrar transmissão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Live</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja <strong>cancelar</strong> esta live?
              <br /><br />
              A live será marcada como cancelada e não poderá mais ser iniciada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isUpdating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUpdating ? "Cancelando..." : "Cancelar Live"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
