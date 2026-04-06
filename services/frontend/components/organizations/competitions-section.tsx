"use client";

import { useState, useEffect } from "react";
import { Plus, Trophy, Calendar, Users, Loader2, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listCompetitions,
  updateCompetition,
  deleteCompetition,
  listSportRulesets,
  getCompetitionTeamsWithPlayers,
} from "@/actions/competitions";
import { CreateCompetitionDialog } from "./create-competition-dialog";
import { CompetitionManagementDialogs } from "./competition-management-dialogs";
import type { Competition, CompetitionStatus, CompetitionSystem } from "@/types/competition";
import Link from "next/link";

const statusLabels: Record<CompetitionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Não iniciado", variant: "secondary" },
  started: { label: "Em Andamento", variant: "default" },
  finished: { label: "Finalizada", variant: "outline" },
};

interface CompetitionsSectionProps {
  organizationSlug: string;
  orgCode: string;
  isAdmin: boolean;
  isPending: boolean;
}

export function CompetitionsSection({ organizationSlug, orgCode, isAdmin, isPending }: CompetitionsSectionProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [sportRulesets, setSportRulesets] = useState<any[]>([]);
  const [editingForm, setEditingForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    min_members_per_team: 1,
    max_members_per_team: 1,
    system: "points" as CompetitionSystem,
    sport_ruleset_id: "",
    stats_ruleset_mode: "keep" as "keep" | "none" | "new",
    teams_per_group: 4,
    teams_qualified_per_group: 2,
  });
  const [editingRules, setEditingRules] = useState({
    canEditBeforeStart: false,
    canEditMembers: false,
    canSetStatsNone: false,
    canSetStatsNew: false,
  });
  const [isSavingCompetition, setIsSavingCompetition] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<Competition | null>(null);

  useEffect(() => {
    if (!isPending) {
      loadCompetitions();
    }
  }, [isPending]);

  async function loadCompetitions() {
    try {
      setIsLoading(true);
      const data = await listCompetitions(0, 100, orgCode);
      setCompetitions(data);
    } catch (error) {
      console.error("Erro ao carregar competições:", error);
      toast.error("Erro ao carregar competições");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCompetitionCreated() {
    loadCompetitions();
    setIsCreateDialogOpen(false);
  }

  async function handleSaveCompetition() {
    if (!editingCompetition) return;
    const name = editingForm.name.trim();
    if (!name) {
      toast.error("Informe o nome da competição");
      return;
    }
    setIsSavingCompetition(true);
    try {
      await updateCompetition(editingCompetition.id, {
        name,
        start_date: editingForm.start_date || undefined,
        end_date: editingForm.end_date || undefined,
        min_members_per_team: editingRules.canEditMembers ? editingForm.min_members_per_team : undefined,
        max_members_per_team: editingRules.canEditMembers ? editingForm.max_members_per_team : undefined,
        system: editingRules.canEditBeforeStart ? editingForm.system : undefined,
        sport_ruleset_id: editingRules.canEditBeforeStart
          ? (editingForm.sport_ruleset_id || undefined)
          : undefined,
        stats_ruleset_mode: editingRules.canEditBeforeStart ? editingForm.stats_ruleset_mode : "keep",
      });
      toast.success("Competição atualizada com sucesso");
      setEditingCompetition(null);
      await loadCompetitions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar competição";
      toast.error(message);
    } finally {
      setIsSavingCompetition(false);
    }
  }

  async function openEditCompetition(competition: Competition) {
    try {
      const [rulesetsRaw, teams] = await Promise.all([
        listSportRulesets(0, 100, orgCode),
        getCompetitionTeamsWithPlayers(competition.id).then((items) => items.length).catch(() => 0),
      ]);

      let rulesets = rulesetsRaw;
      if (
        competition.sport_ruleset &&
        !rulesets.some((r) => String(r.id) === String(competition.sport_ruleset!.id))
      ) {
        rulesets = [competition.sport_ruleset, ...rulesets];
      }
      setSportRulesets(rulesets);

      const hasStatsRuleset = !!competition.stats_ruleset;
      const statsCount = competition.stats_ruleset?.stats_types?.length ?? 0;
      const canEditBeforeStart = competition.status === "pending";
      const canEditMembers = teams === 0;

      setEditingRules({
        canEditBeforeStart,
        canEditMembers,
        canSetStatsNone: canEditBeforeStart && hasStatsRuleset && statsCount === 0,
        canSetStatsNew: canEditBeforeStart && !hasStatsRuleset,
      });

      const toDatetimeLocal = (isoDate: string) => {
        const d = new Date(isoDate);
        if (Number.isNaN(d.getTime())) return "";
        const pad = (v: number) => `${v}`.padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setEditingForm({
        name: competition.name,
        start_date: toDatetimeLocal(competition.start_date),
        end_date: toDatetimeLocal(competition.end_date),
        min_members_per_team: competition.min_members_per_team,
        max_members_per_team: competition.max_members_per_team,
        system: competition.system,
        sport_ruleset_id: competition.sport_ruleset_id ? String(competition.sport_ruleset_id) : "",
        stats_ruleset_mode: "keep",
        teams_per_group: competition.teams_per_group || 4,
        teams_qualified_per_group: competition.teams_qualified_per_group || 2,
      });
      setEditingCompetition(competition);
    } catch (error) {
      toast.error("Erro ao preparar edição da competição");
    }
  }

  async function handleConfirmDeleteCompetition() {
    if (!competitionToDelete) return;
    try {
      await deleteCompetition(competitionToDelete.id);
      toast.success("Competição excluída com sucesso");
      setCompetitionToDelete(null);
      await loadCompetitions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir competição";
      toast.error(message);
    }
  }

  if (isPending && isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competições
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>A criação de competições estará disponível após a aprovação da organização.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competições
              </CardTitle>
              <CardDescription>
                {competitions.length > 0
                  ? `${competitions.length} competição(ões) cadastrada(s)`
                  : "Nenhuma competição criada ainda"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="bg-main hover:bg-main/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Competição
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : competitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhuma competição ainda</p>
              {isAdmin && (
                <p className="text-sm mt-2">Clique em "Nova Competição" para criar a primeira</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitions.map((competition) => (
                <Link 
                  key={competition.id}
                  href={`/competitions/${competition.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{competition.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusLabels[competition.status].variant}>
                            {statusLabels[competition.status].label}
                          </Badge>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditCompetition(competition);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCompetitionToDelete(competition);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Trophy className="w-3 h-3" />
                        {competition.system === "points"
                          ? "Pontos Corridos"
                          : competition.system === "elimination"
                          ? "Eliminatória"
                          : "Grupos + Mata-mata"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(competition.start_date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Users className="w-3 h-3" />
                        <span>
                          {competition.min_members_per_team}-{competition.max_members_per_team} jogadores
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCompetitionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgCode={orgCode}
        onSuccess={handleCompetitionCreated}
      />

      <CompetitionManagementDialogs
        editOpen={!!editingCompetition}
        onEditOpenChange={(open) => {
          if (!open) setEditingCompetition(null);
        }}
        deleteOpen={!!competitionToDelete}
        onDeleteOpenChange={(open) => {
          if (!open) setCompetitionToDelete(null);
        }}
        deleteCompetitionName={competitionToDelete?.name}
        form={editingForm}
        setForm={setEditingForm}
        rules={editingRules}
        sportRulesets={sportRulesets}
        isSaving={isSavingCompetition}
        onSave={handleSaveCompetition}
        onConfirmDelete={handleConfirmDeleteCompetition}
      />
    </>
  );
}
