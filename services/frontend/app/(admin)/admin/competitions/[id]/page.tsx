"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Calendar, Users, Trophy, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getCompetition, generateCompetitionStructure } from "@/actions/competitions";
import type { Competition, CompetitionStatus } from "@/types/competition";

const statusLabels: Record<CompetitionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  started: { label: "Em Andamento", variant: "default" },
  finished: { label: "Finalizada", variant: "outline" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CompetitionDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadCompetition();
  }, [resolvedParams.id]);

  async function loadCompetition() {
    try {
      setIsLoading(true);
      const data = await getCompetition(parseInt(resolvedParams.id));
      setCompetition(data);
    } catch (error) {
      console.error("Erro ao carregar competição:", error);
      toast.error("Erro ao carregar competição");
      router.push("/admin/competitions");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateStructure() {
    if (!competition) return;

    // TODO: Obter organization_id do contexto ou usuário
    const organizationId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // Substituir por ID real

    try {
      setIsGenerating(true);
      await generateCompetitionStructure(competition.id, { organization_id: organizationId });
      toast.success("Estrutura gerada com sucesso!");
      loadCompetition();
    } catch (error) {
      console.error("Erro ao gerar estrutura:", error);
      toast.error("Erro ao gerar estrutura da competição");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!competition) {
    return null;
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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{competition.name}</h1>
            <Badge variant={statusLabels[competition.status].variant}>
              {statusLabels[competition.status].label}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">Competição ID: {competition.id}</p>
        </div>
        {competition.status === "pending" && (
          <Button
            onClick={handleGenerateStructure}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Gerar Estrutura
              </>
            )}
          </Button>
        )}
      </div>

      {competition.status === "pending" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Estrutura Pendente</p>
                <p className="text-sm text-amber-700 mt-1">
                  Esta competição ainda não teve sua estrutura de jogos gerada. 
                  Clique em "Gerar Estrutura" para criar as partidas e configurações necessárias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Sistema</p>
              <p className="font-semibold">
                {competition.system === "points"
                  ? "Pontos Corridos"
                  : competition.system === "elimination"
                  ? "Eliminatória"
                  : "Misto"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Início</p>
              <p className="font-semibold">
                {new Date(competition.start_date).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Término</p>
              <p className="font-semibold">
                {new Date(competition.end_date).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Modalidade ID</p>
              <p className="font-semibold">{competition.modality_id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Configuração de Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Jogadores por Time</p>
              <p className="font-semibold">
                {competition.min_members_per_team} - {competition.max_members_per_team} jogadores
              </p>
            </div>
            {competition.teams_per_group && (
              <div>
                <p className="text-sm text-gray-500">Times por Grupo</p>
                <p className="font-semibold">{competition.teams_per_group}</p>
              </div>
            )}
            {competition.teams_qualified_per_group && (
              <div>
                <p className="text-sm text-gray-500">Classificados por Grupo</p>
                <p className="font-semibold">{competition.teams_qualified_per_group}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {competition.sport_ruleset && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Regras do Jogo</CardTitle>
              <CardDescription>{competition.sport_ruleset.name}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Tipo de Segmento</p>
                <p className="font-semibold">{competition.sport_ruleset.segment_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tempos Regulares</p>
                <p className="font-semibold">{competition.sport_ruleset.segments_regular_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prorrogação</p>
                <p className="font-semibold">{competition.sport_ruleset.overtime_segments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pênaltis</p>
                <p className="font-semibold">{competition.sport_ruleset.penalty_segments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Intervalo</p>
                <p className="font-semibold">
                  {competition.sport_ruleset.has_break_segments ? "Sim" : "Não"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
