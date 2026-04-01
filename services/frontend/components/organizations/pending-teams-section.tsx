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

interface PendingTeamsSectionProps {
  organizationSlug: string;
  isAdmin: boolean;
}

export function PendingTeamsSection({ organizationSlug, isAdmin }: PendingTeamsSectionProps) {
  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadPendingTeams();
    }
  }, [isAdmin]);

  async function loadPendingTeams() {
    try {
      setIsLoading(true);
      const data = await getPendingTeams(organizationSlug);
      setTeams(data);
    } catch (error) {
      console.error("Erro ao carregar times pendentes:", error);
      // Não mostrar toast de erro se não houver permissão
      if (error instanceof Error && !error.message.includes("organizadores")) {
        toast.error("Erro ao carregar times pendentes");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(team: TeamDetail) {
    setIsProcessing(true);
    try {
      await approveTeam(team.id);
      toast.success(`Time "${team.name}" aprovado com sucesso!`);
      // Remove da lista
      setTeams(prev => prev.filter(t => t.id !== team.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao aprovar time";
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
      toast.success(`Time "${selectedTeam.name}" rejeitado.`);
      // Remove da lista
      setTeams(prev => prev.filter(t => t.id !== selectedTeam.id));
      setIsRejectDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao rejeitar time";
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Times Aguardando Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return null; // Não mostrar nada se não houver times pendentes
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertCircle className="h-5 w-5" />
            Times Aguardando Aprovação
            <Badge variant="secondary" className="ml-2">
              {teams.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Aprove ou rejeite os times que solicitaram participação nas competições
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 flex gap-3 min-w-0">
                    <TeamLogo
                      name={team.name}
                      abbreviation={team.abbreviation}
                      logoUrl={team.logo_url}
                      className="h-12 w-12 shrink-0"
                      textClassName="text-sm"
                    />
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Link
                        href={`/clubes/${team.id}`}
                        className="font-semibold text-gray-900 hover:text-main hover:underline"
                      >
                        {team.name}
                      </Link>
                      <span className="text-sm text-gray-500">({team.abbreviation})</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {team.member_count} jogador{team.member_count !== 1 ? "es" : ""} 
                          {" "} (mínimo: {team.min_members}, máximo: {team.max_members})
                        </span>
                      </div>
                      <div className="text-sm font-medium text-orange-700">
                        Competição: {team.competition_name}
                      </div>
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      onClick={() => openRejectDialog(team)}
                      disabled={isProcessing}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(team)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
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

      {/* Dialog de Rejeição */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Time</DialogTitle>
            <DialogDescription>
              Você está prestes a rejeitar o time "{selectedTeam?.name}". 
              Forneça um motivo (opcional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da rejeição (opcional)</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Time não atingiu o mínimo de jogadores..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                "Rejeitar Time"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
