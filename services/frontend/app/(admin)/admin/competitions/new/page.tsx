"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function NewCompetitionPage() {
  const router = useRouter();
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
    loadModalities();
  }, []);

  async function loadModalities() {
    try {
      const data = await listModalities(0, 100);
      setModalities(data);
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
      router.push("/admin/competitions");
    } catch (error) {
      console.error("Erro ao criar competição:", error);
      toast.error("Erro ao criar competição");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova Competição</h1>
          <p className="text-gray-600">Preencha os dados para criar uma nova competição</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações da Competição</CardTitle>
            <CardDescription>
              Configure os detalhes básicos da competição
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                    {modalities.map((modality) => (
                      <SelectItem key={modality.id} value={modality.id.toString()}>
                        {modality.name}
                      </SelectItem>
                    ))}
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

              {formData.system === "mixed" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="teams_per_group">Times por Grupo</Label>
                    <Input
                      id="teams_per_group"
                      type="number"
                      min="1"
                      value={formData.teams_per_group || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          teams_per_group: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teams_qualified">Times Classificados por Grupo</Label>
                    <Input
                      id="teams_qualified"
                      type="number"
                      min="1"
                      value={formData.teams_qualified_per_group || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          teams_qualified_per_group: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Regras do Jogo</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ruleset_name">Nome das Regras</Label>
                  <Input
                    id="ruleset_name"
                    value={formData.ruleset?.name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleset: { ...formData.ruleset!, name: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segment_type">Tipo de Segmento</Label>
                  <Select
                    value={formData.ruleset?.segment_type || "TIME"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        ruleset: { ...formData.ruleset!, segment_type: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIME">Tempo</SelectItem>
                      <SelectItem value="SET">Set</SelectItem>
                      <SelectItem value="QUARTER">Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segments_regular">Número de Tempos Regulares</Label>
                  <Input
                    id="segments_regular"
                    type="number"
                    min="1"
                    value={formData.ruleset?.segments_regular_number || 2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleset: {
                          ...formData.ruleset!,
                          segments_regular_number: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime_segments">Tempos de Prorrogação</Label>
                  <Input
                    id="overtime_segments"
                    type="number"
                    min="0"
                    value={formData.ruleset?.overtime_segments || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleset: {
                          ...formData.ruleset!,
                          overtime_segments: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalty_segments">Séries de Pênaltis</Label>
                  <Input
                    id="penalty_segments"
                    type="number"
                    min="0"
                    value={formData.ruleset?.penalty_segments || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleset: {
                          ...formData.ruleset!,
                          penalty_segments: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Competição"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
