"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { createCompetition } from "@/actions/competitions";
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
  const [isLoading, setIsLoading] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [formData, setFormData] = useState<CompetitionCreate>({
    name: "",
    modality_id: 0,
    start_date: "",
    end_date: "",
    system: "points" as CompetitionSystem,
    min_members_per_team: 5,
    max_members_per_team: 20,
    ruleset: {
      name: "Regras Padrão",
      segment_type: "TIME",
      segments_regular_number: 2,
      overtime_segments: 0,
      penalty_segments: 0,
      has_break_segments: true,
    },
  });

  useEffect(() => {
    if (open) {
      loadModalities();
    }
  }, [open, orgCode]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.modality_id || !formData.start_date || !formData.end_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsLoading(true);
      await createCompetition(formData);
      toast.success("Competição criada com sucesso!");
      setFormData({
        name: "",
        modality_id: 0,
        start_date: "",
        end_date: "",
        system: "points" as CompetitionSystem,
        min_members_per_team: 5,
        max_members_per_team: 20,
        ruleset: {
          name: "Regras Padrão",
          segment_type: "TIME",
          segments_regular_number: 2,
          overtime_segments: 0,
          penalty_segments: 0,
          has_break_segments: true,
        },
      });
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
                  value={formData.modality_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, modality_id: parseInt(value) })
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
                        <SelectItem key={modality.id} value={modality.id.toString()}>
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
                    <SelectItem value="mixed">Misto</SelectItem>
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
            <Button type="submit" disabled={isLoading || modalities.length === 0}>
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
