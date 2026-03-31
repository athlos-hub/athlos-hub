"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createCompetition, listSportRulesets } from "@/actions/competitions";
import { listModalities } from "@/actions/modalities";
import type { CompetitionCreate, CompetitionSystem } from "@/types/competition";
import type { Modality } from "@/types/modality";

interface CreateCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgCode: string;
  onSuccess: () => void;
}

export function CreateCompetitionDialog({
  open,
  onOpenChange,
  orgCode,
  onSuccess,
}: CreateCompetitionDialogProps) {
  const segmentTypeLabel: Record<string, string> = {
    TIME: "Tempos",
    SET: "Sets",
    QUARTER: "Quartos",
  };

  const [isLoading, setIsLoading] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [sportRulesets, setSportRulesets] = useState<any[]>([]);
  const [rulesetOption, setRulesetOption] = useState<"existing" | "new" | "none">("new"); // Padrão: criar novo ruleset
  const [statsRulesetOption, setStatsRulesetOption] = useState<"default" | "none">("none");
  const [selectedRulesetId, setSelectedRulesetId] = useState<string>("");
  
  const [formData, setFormData] = useState<CompetitionCreate>({
    name: "",
    modality_id: "",
    start_date: "",
    end_date: "",
    system: "points" as CompetitionSystem,
    min_members_per_team: 5,
    max_members_per_team: 20,
  });

  const [newRuleset, setNewRuleset] = useState({
    name: "Regras Padrão",
    segment_type: "TIME",
    segments_regular_number: 2,
    overtime_segments: 0,
    penalty_segments: 0,
    has_break_segments: true,
  });

  useEffect(() => {
    if (open) {
      loadModalities();
      loadSportRulesets();
    }
  }, [open, orgCode]);

  useEffect(() => {
    if (sportRulesets.length === 0 && rulesetOption === "existing") {
      setRulesetOption("new");
    }
  }, [sportRulesets.length, rulesetOption]);

  async function loadModalities() {
    try {
      const data = await listModalities(0, 100);
      const filtered = data.filter(m => m.organization_slug === orgCode);
      setModalities(filtered);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
      toast.error("Erro ao carregar modalidades");
    }
  }

  async function loadSportRulesets() {
    try {
      const data = await listSportRulesets(0, 100, orgCode);
      setSportRulesets(data);
      if (data.length > 0) {
        setSelectedRulesetId((prev) => {
          if (prev && data.some((r: { id: string }) => String(r.id) === prev)) return prev;
          return data[0].id.toString();
        });
      } else {
        setSelectedRulesetId("");
      }
    } catch (error) {
      console.error("[SPORT RULESETS] Erro ao carregar:", error);
      toast.error("Erro ao carregar conjunto de regras");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log("[SUBMIT] Iniciando submissão...");
    console.log("[SUBMIT] FormData:", formData);
    console.log("[SUBMIT] Ruleset Option:", rulesetOption);
    console.log("[SUBMIT] Stats Ruleset Option:", statsRulesetOption);

    if (!formData.name || !formData.modality_id || !formData.start_date || !formData.end_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsLoading(true);
      
      // Preparar dados baseado na opção selecionada
      const dataToSend: CompetitionCreate = {
        ...formData,
      };

      // Sport Ruleset
      if (rulesetOption === "existing") {
        if (selectedRulesetId) {
          dataToSend.sport_ruleset_id = selectedRulesetId;
          console.log("[SUBMIT] Usando sport_ruleset_id:", dataToSend.sport_ruleset_id);
        }
      } else if (rulesetOption === "new") {
        dataToSend.ruleset = newRuleset;
        console.log("[SUBMIT] Criando novo ruleset:", dataToSend.ruleset);
      }

      // Stats Ruleset
      if (statsRulesetOption === "default") {
        dataToSend.stats_ruleset = {
          name: "Estatísticas Padrão",
          description: "Conjunto de estatísticas padrão",
          stats_types: [],
        };
        console.log("[SUBMIT] Criando novo stats_ruleset:", dataToSend.stats_ruleset);
      }

      console.log("[SUBMIT] Dados finais a serem enviados:", JSON.stringify(dataToSend, null, 2));

      await createCompetition(dataToSend);
      toast.success("Competição criada com sucesso!");
      
      // Reset form
      setFormData({
        name: "",
        modality_id: "",
        start_date: "",
        end_date: "",
        system: "points" as CompetitionSystem,
        min_members_per_team: 5,
        max_members_per_team: 20,
      });
      setRulesetOption("new");
      setStatsRulesetOption("none");
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar competição:", error);
      toast.error("Erro ao criar competição");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Competição</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova competição
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Competição *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Campeonato de Futsal 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modality">Modalidade *</Label>
                <Select
                  value={formData.modality_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, modality_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalities.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma modalidade cadastrada
                      </div>
                    ) : (
                      modalities.map((modality) => (
                        <SelectItem key={modality.id} value={modality.id}>
                          {modality.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Término *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system">Sistema *</Label>
                <Select
                  value={formData.system}
                  onValueChange={(value) =>
                    setFormData({ ...formData, system: value as CompetitionSystem })
                  }
                  required
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

              <div className="space-y-2">
                <Label htmlFor="min_members">Mínimo de Jogadores *</Label>
                <Input
                  id="min_members"
                  type="number"
                  min="1"
                  value={formData.min_members_per_team}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_members_per_team: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Máximo de Jogadores *</Label>
                <Input
                  id="max_members"
                  type="number"
                  min="1"
                  value={formData.max_members_per_team}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_members_per_team: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* Seção de Sport Ruleset */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <Label>Conjunto de Regras Esportivas *</Label>
              <Select
                value={rulesetOption}
                onValueChange={(value: any) => setRulesetOption(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Criar novo conjunto</SelectItem>
                  {sportRulesets.length > 0 && (
                    <SelectItem value="existing">Usar conjunto existente</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {rulesetOption === "existing" && (
                <div className="space-y-2">
                  <Label htmlFor="ruleset">Selecione um conjunto</Label>
                  <Select
                    value={selectedRulesetId}
                    onValueChange={setSelectedRulesetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um conjunto de regras" />
                    </SelectTrigger>
                    <SelectContent>
                      {sportRulesets.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhum conjunto cadastrado. Crie um novo.
                        </div>
                      ) : (
                        sportRulesets.map((ruleset) => (
                          <SelectItem key={ruleset.id} value={ruleset.id.toString()}>
                            {ruleset.name} ({ruleset.segments_regular_number} {segmentTypeLabel[ruleset.segment_type] ?? "Tipo não definido"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {rulesetOption === "new" && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ruleset_name">Nome do Conjunto *</Label>
                      <Input
                        id="ruleset_name"
                        value={newRuleset.name}
                        onChange={(e) => setNewRuleset({ ...newRuleset, name: e.target.value })}
                        placeholder="Ex: Regras Futsal FIFUSF"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="segment_type">Tipo de Segmento *</Label>
                      <Select
                        value={newRuleset.segment_type}
                        onValueChange={(value) => setNewRuleset({ ...newRuleset, segment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TIME">Tempos</SelectItem>
                          <SelectItem value="SET">Sets</SelectItem>
                          <SelectItem value="QUARTER">Quartos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="segments_regular">Número de Tempos Regulares *</Label>
                      <Input
                        id="segments_regular"
                        type="number"
                        min="1"
                        value={newRuleset.segments_regular_number}
                        onChange={(e) => setNewRuleset({ ...newRuleset, segments_regular_number: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="overtime_segments">Prorrogações</Label>
                      <Input
                        id="overtime_segments"
                        type="number"
                        min="0"
                        value={newRuleset.overtime_segments}
                        onChange={(e) => setNewRuleset({ ...newRuleset, overtime_segments: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Stats Ruleset */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <div>
                <Label>Conjunto de Estatísticas (Opcional)</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Define quais estatísticas serão rastreadas durante os jogos
                </p>
              </div>
              <Select
                value={statsRulesetOption}
                onValueChange={(value: any) => setStatsRulesetOption(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="default">Criar conjunto vazio (configurar depois)</SelectItem>
                </SelectContent>
              </Select>
              {statsRulesetOption === "default" && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <p className="text-sm text-gray-600">
                    Será criado um conjunto sem métricas iniciais. Depois da competição criada, você configura as estatísticas na aba de Estatísticas.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || modalities.length === 0} className="bg-main hover:bg-main/90 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
