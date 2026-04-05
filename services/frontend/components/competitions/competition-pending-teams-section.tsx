"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CheckCircle, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPendingTeams, approveTeam, rejectTeam } from "@/actions/teams";
import type { TeamDetail } from "@/types/team";
import { TeamLogo } from "@/components/teams/team-logo";

interface CompetitionPendingTeamsSectionProps {
  organizationSlug: string;
  competitionId: string;
  /** Nome da competição (contexto na UI) */
  competitionName?: string;
  isAdmin: boolean;
  /** Após aprovar/rejeitar, atualiza a lista de times na competição */
  onChanged?: () => void | Promise<void>;
}

export function CompetitionPendingTeamsSection({
  organizationSlug,
  competitionId,
  competitionName,
  isAdmin,
  onChanged,
}: CompetitionPendingTeamsSectionProps) {
  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAdmin || !organizationSlug || !competitionId) {
      setIsLoading(false);
      return;
    }
    void loadPendingTeams();
  }, [isAdmin, organizationSlug, competitionId]);

  async function loadPendingTeams() {
    try {
      setIsLoading(true);
      const data = await getPendingTeams(organizationSlug, competitionId);
      setTeams(data);
    } catch (error) {
      console.error("Erro ao carregar equipes aguardando aprovação:", error);
      if (error instanceof Error && !error.message.includes("organizadores")) {
        toast.error("Erro ao carregar equipes aguardando aprovação");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(team: TeamDetail) {
    setIsProcessing(true);
    try {
      await approveTeam(team.id);
      toast.success(`Equipe "${team.name}" aprovada.`);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao aprovar equipe";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  function openRejectDialog(team: TeamDetail) {
    setSelectedTeam(team);
    setRejectReason("");
    setIsRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!selectedTeam) return;

    setIsProcessing(true);
    try {
      await rejectTeam(selectedTeam.id, rejectReason);
      toast.success(`Equipe "${selectedTeam.name}" rejeitada.`);
      setTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id));
      setIsRejectDialogOpen(false);
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao rejeitar equipe";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Equipes aguardando aprovação
          </CardTitle>
          {competitionName && (
            <CardDescription>{competitionName}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-950">
            <AlertCircle className="h-5 w-5" />
            Equipes aguardando aprovação
            <Badge variant="secondary" className="ml-1">
              {teams.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {competitionName
              ? `Pedidos de inscrição nesta competição (${competitionName}). Aprove ou rejeite para liberar na disputa.`
              : "Aprove ou rejeite as equipes que solicitaram inscrição nesta competição."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-border bg-card p-4 hover:border-amber-300/80 transition-colors"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <TeamLogo
                      name={team.name}
                      abbreviation={team.abbreviation}
                      logoUrl={team.logo_url}
                      className="h-12 w-12 shrink-0"
                      textClassName="text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/clubes/${team.id}`}
                          className="font-semibold text-foreground hover:text-main hover:underline"
                        >
                          {team.name}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          ({team.abbreviation})
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {team.member_count} jogador
                            {team.member_count !== 1 ? "es" : ""} (mín. {team.min_members}, máx.{" "}
                            {team.max_members})
                          </span>
                        </div>
                        <div className="font-medium text-amber-900/90">
                          Competição: {team.competition_name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => openRejectDialog(team)}
                      disabled={isProcessing}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => handleApprove(team)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1 h-4 w-4" />
                      )}
                      Aprovar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar equipe</DialogTitle>
            <DialogDescription>
              Você está prestes a rejeitar a equipe &quot;{selectedTeam?.name}&quot;. Motivo opcional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo (opcional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex.: equipe não atende ao regulamento..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button variant="destructive" type="button" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                "Rejeitar equipe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
