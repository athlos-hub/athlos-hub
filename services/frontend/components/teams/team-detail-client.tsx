"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, Trophy, Building2, CheckCircle, Loader2, UserPlus, XCircle, Clock, Trash2, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamInviteDialog } from "./team-invite-dialog";
import { TeamPlayersSection } from "./team-players-section";
import { FollowTeamButton } from "./follow-team-button";
import { TeamPostsSection } from "./team-posts-section";
import { TeamStatus } from "@/types/team";
import type { TeamDetail } from "@/types/team";
import { deleteTeam, requestTeamApproval } from "@/actions/teams";
import { APIException } from "@/lib/api/errors";
import { canApprove } from "@/lib/teams/utils";
import { getTeamProfile, type TeamProfile as TeamSocialProfile } from "@/actions/social-profiles";
import { getTeamFollowersCount } from "@/actions/team-follow";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel } from "@/components/layout/filter-panel";
import { AchievementsSection } from "@/components/achievements/achievements-section";
import { normalizeAchievementsRecord } from "@/lib/achievements/normalize";
import { TeamLogo } from "@/components/teams/team-logo";
import { EditTeamDialog, EditTeamDialogTrigger } from "@/components/teams/edit-team-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamDetailClientProps {
  team: TeamDetail;
  /** Campeonato ainda não começou (competição *pending*): capitão pode excluir a equipe. */
  competitionPendingForDeletion?: boolean;
}

export function TeamDetailClient({
  team: initialTeam,
  competitionPendingForDeletion = false,
}: TeamDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [team, setTeam] = useState(initialTeam);
  const [isApproving, setIsApproving] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teamSocialProfile, setTeamSocialProfile] = useState<TeamSocialProfile | null>(null);
  const [teamContentTab, setTeamContentTab] = useState<"posts" | "achievements">("posts");

  /** Social usa o ID do time no competitions-service (auth: external_team_id). */
  const socialTeamId = useMemo(() => {
    const ext = team.external_team_id?.trim();
    if (ext) return ext;
    return team.id;
  }, [team.external_team_id, team.id]);

  useEffect(() => {
    let cancelled = false;
    getTeamProfile(socialTeamId).then((p) => {
      if (cancelled) return;
      setTeamSocialProfile(p);
      if (p?.approvedForSocial) {
        getTeamFollowersCount(socialTeamId)
          .then(setFollowersCount)
          .catch(() => setFollowersCount(0));
      } else {
        setFollowersCount(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [socialTeamId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.teamId === socialTeamId || detail?.teamId === team.id) {
        getTeamFollowersCount(socialTeamId)
          .then(setFollowersCount)
          .catch(() => setFollowersCount(0));
      }
    };
    window.addEventListener("team:follow-changed", handler);
    return () => window.removeEventListener("team:follow-changed", handler);
  }, [socialTeamId, team.id]);
  
  // Verifica se o usuário logado é capitão
  const isCaptain = team.members?.some(
    m => m.is_captain && m.user.keycloak_id === session?.user?.keycloakId
  ) ?? false;
  
  const memberCount = team.members?.length ?? 0;
  const canRequestApproval = canApprove(team) && isCaptain && 
    (team.status === TeamStatus.RECRUITING || team.status === TeamStatus.PENDING);

  const getStatusConfig = (status: TeamStatus) => {
    const configs = {
      [TeamStatus.PENDING]: { 
        label: "Pendente", 
        className: "bg-yellow-50 text-yellow-700 border-yellow-300",
        icon: Clock 
      },
      [TeamStatus.RECRUITING]: { 
        label: "Recrutando", 
        className: "bg-blue-50 text-blue-700 border-blue-300",
        icon: UserPlus 
      },
      [TeamStatus.READY]: { 
        label: "Pronto para Aprovação", 
        className: "bg-green-50 text-green-700 border-green-300",
        icon: CheckCircle 
      },
      [TeamStatus.APPROVED]: { 
        label: "Aprovado", 
        className: "bg-green-500 text-white border-green-500",
        icon: CheckCircle 
      },
      [TeamStatus.REJECTED]: { 
        label: "Rejeitado", 
        className: "bg-red-50 text-red-700 border-red-300",
        icon: XCircle 
      },
      [TeamStatus.ACTIVE]: { 
        label: "Ativo", 
        className: "bg-green-500 text-white border-green-500",
        icon: CheckCircle 
      },
    };
    return configs[status] || configs[TeamStatus.PENDING];
  };

  const statusConfig = getStatusConfig(team.status);
  const StatusIcon = statusConfig.icon;

  /** Só há perfil e posts sociais consolidados após aprovação na competição. */
  const showTeamPosts =
    team.status === TeamStatus.APPROVED || team.status === TeamStatus.ACTIVE;

  const teamAchievementsRecord = useMemo(
    () => normalizeAchievementsRecord(teamSocialProfile?.achievements),
    [teamSocialProfile?.achievements],
  );
  const teamAchievementsCount = teamSocialProfile?.achievementsCount ?? 0;

  const teamTabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-main text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  const handleDeleteTeam = async () => {
    setDeleting(true);
    try {
      await deleteTeam(team.id);
      toast.success("Equipe excluída.");
      setDeleteOpen(false);
      setDeleting(false);
      // Navegação completa evita soft-navigation presa após server action + estado do dialog.
      window.location.assign("/clubes/painel");
    } catch (error) {
      const message =
        error instanceof APIException
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível excluir a equipe";
      toast.error(message);
      setDeleting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await requestTeamApproval(team.id);
      toast.success("Solicitação de aprovação enviada! Aguarde um organizador aprovar o time.");
      // Atualiza o estado local
      setTeam(prev => ({ ...prev, status: TeamStatus.READY }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao solicitar aprovação";
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhes do Time"
        subtitle="Acompanhe as informações do time"
      />

      {/* Card principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <TeamLogo
                key={`${team.id}-${team.logo_url ?? "none"}`}
                name={team.name}
                abbreviation={team.abbreviation}
                logoUrl={team.logo_url}
                className="h-16 w-16 rounded-lg"
                textClassName="text-2xl"
              />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl">{team.name}</CardTitle>
                  <Badge variant="outline" className={statusConfig.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {followersCount} seguidor{followersCount !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              {isCaptain && competitionPendingForDeletion && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir equipe
                </Button>
              )}
              {isCaptain && (
                <EditTeamDialogTrigger onClick={() => setEditOpen(true)} />
              )}
              {teamSocialProfile?.approvedForSocial === true && (
                <FollowTeamButton teamId={socialTeamId} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {team.competition_name && (
              <CardDescription className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-main" />
                {team.competition_name}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            {team.organization_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-main" />
                {team.organization_name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-main" />
              Criado em {new Date(team.created_at).toLocaleDateString("pt-BR")}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-main" />
              {memberCount} membro{memberCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Progresso de recrutamento */}
          {(team.status === TeamStatus.RECRUITING || team.status === TeamStatus.PENDING) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Progresso de Recrutamento</span>
                <span className="text-sm text-blue-600">
                  {memberCount} / {team.min_members} mínimo
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((memberCount / team.min_members) * 100, 100)}%` }}
                />
              </div>
              {memberCount < team.min_members && (
                <p className="text-xs text-blue-600 mt-2">
                  Faltam {team.min_members - memberCount} jogador(es) para solicitar aprovação
                </p>
              )}
            </div>
          )}

          {/* Ações do capitão */}
          {isCaptain && (
            <>
              <hr className="my-4 border-border" />
              {!competitionPendingForDeletion && (
                <p className="text-xs text-muted-foreground mb-3">
                  A exclusão da equipe só é permitida antes do início do campeonato (competição ainda
                  em preparação). Apenas o capitão pode excluir.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {team.status !== TeamStatus.APPROVED && team.status !== TeamStatus.REJECTED && (
                  <TeamInviteDialog teamId={team.id} teamName={team.name} />
                )}
                
                {canRequestApproval && (
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Solicitar Aprovação
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção de jogadores */}
      <TeamPlayersSection 
        members={team.members ?? []}
      />

      {showTeamPosts && (
        <div className="space-y-4">
          <FilterPanel icon={<Filter className="w-5 h-5 text-gray-600" />}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTeamContentTab("posts")}
                className={teamTabClass(teamContentTab === "posts")}
              >
                Posts
              </button>
              <button
                type="button"
                onClick={() => setTeamContentTab("achievements")}
                className={teamTabClass(teamContentTab === "achievements")}
              >
                Conquistas
                {teamAchievementsCount > 0 && (
                  <span className="ml-1.5 text-xs opacity-90">({teamAchievementsCount})</span>
                )}
              </button>
            </div>
          </FilterPanel>
          {teamContentTab === "posts" && <TeamPostsSection teamId={socialTeamId} />}
          {teamContentTab === "achievements" && (
            <AchievementsSection
              achievements={teamAchievementsRecord}
              achievementsCount={teamAchievementsCount}
              maxDisplay={12}
            />
          )}
        </div>
      )}

      {isCaptain && (
        <EditTeamDialog
          team={team}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={(t) => {
            setTeam(t);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os membros serão removidos do time e o registro
              na competição será apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} type="button">
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
              onClick={() => {
                void handleDeleteTeam();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
