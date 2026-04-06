"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CompetitionSystem } from "@/types/competition";

type StatsMode = "keep" | "none" | "new";

interface CompetitionEditForm {
  name: string;
  start_date: string;
  end_date: string;
  min_members_per_team: number;
  max_members_per_team: number;
  system: CompetitionSystem;
  sport_ruleset_id: string;
  stats_ruleset_mode: StatsMode;
  teams_per_group: number;
  teams_qualified_per_group: number;
}

interface CompetitionEditRules {
  canEditBeforeStart: boolean;
  canEditMembers: boolean;
  canSetStatsNone: boolean;
  canSetStatsNew: boolean;
}

interface CompetitionManagementDialogsProps {
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  deleteCompetitionName?: string;
  form: CompetitionEditForm;
  setForm: Dispatch<SetStateAction<CompetitionEditForm>>;
  rules: CompetitionEditRules;
  sportRulesets: Array<{ id: string; name: string }>;
  isSaving: boolean;
  onSave: () => void;
  onConfirmDelete: () => void;
}

export function CompetitionManagementDialogs({
  editOpen,
  onEditOpenChange,
  deleteOpen,
  onDeleteOpenChange,
  deleteCompetitionName,
  form,
  setForm,
  rules,
  sportRulesets,
  isSaving,
  onSave,
  onConfirmDelete,
}: CompetitionManagementDialogsProps) {
  return (
    <>
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar competição</DialogTitle>
            <DialogDescription>Atualize os campos permitidos para a competição.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!rules.canEditBeforeStart}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de início</label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de término</label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mínimo de membros</label>
              <Input
                type="number"
                min={1}
                value={form.min_members_per_team}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, min_members_per_team: Number(e.target.value) || 1 }))
                }
                disabled={!rules.canEditMembers}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Máximo de membros</label>
              <Input
                type="number"
                min={1}
                value={form.max_members_per_team}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, max_members_per_team: Number(e.target.value) || 1 }))
                }
                disabled={!rules.canEditMembers}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sistema</label>
              <Select
                value={form.system}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, system: value as CompetitionSystem }))
                }
                disabled={!rules.canEditBeforeStart}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Pontos Corridos</SelectItem>
                  <SelectItem value="elimination">Eliminatória</SelectItem>
                  <SelectItem value="mixed">Grupos + Mata-mata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos de configuração para competições MIXED */}
            {form.system === "mixed" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Times por Grupo
                    <span className="text-xs text-muted-foreground ml-1">(2-16)</span>
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={16}
                    value={form.teams_per_group || 4}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teams_per_group: parseInt(e.target.value) || 4,
                      }))
                    }
                    placeholder="4"
                    disabled={!rules.canEditBeforeStart}
                  />
                  <p className="text-xs text-muted-foreground">
                    Total de times em cada grupo da fase inicial
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Qualificados por Grupo
                    <span className="text-xs text-muted-foreground ml-1">(1-{form.teams_per_group || 4})</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={form.teams_per_group || 4}
                    value={form.teams_qualified_per_group || 2}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teams_qualified_per_group: parseInt(e.target.value) || 2,
                      }))
                    }
                    placeholder="2"
                    disabled={!rules.canEditBeforeStart}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos times de cada grupo avançam para eliminação (total: grupos × qualificados)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Regras esportivas</label>
              <Select
                value={form.sport_ruleset_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, sport_ruleset_id: value }))}
                disabled={!rules.canEditBeforeStart}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um conjunto" />
                </SelectTrigger>
                <SelectContent>
                  {sportRulesets.map((ruleset) => (
                    <SelectItem key={ruleset.id} value={String(ruleset.id)}>
                      {ruleset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Conjunto de estatísticas</label>
              <Select
                value={form.stats_ruleset_mode}
                onValueChange={(value: StatsMode) =>
                  setForm((prev) => ({ ...prev, stats_ruleset_mode: value }))
                }
                disabled={!rules.canEditBeforeStart}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Manter como está</SelectItem>
                  {rules.canSetStatsNone && (
                    <SelectItem value="none">Remover conjunto (sem métricas)</SelectItem>
                  )}
                  {rules.canSetStatsNew && (
                    <SelectItem value="new">Criar novo conjunto vazio</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onEditOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-main hover:bg-main/90 text-white"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir competição</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tem certeza que deseja excluir a competição "${deleteCompetitionName ?? ""}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
