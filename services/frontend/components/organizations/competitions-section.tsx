"use client";

import { useState, useEffect } from "react";
import { Plus, Trophy, Calendar, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listCompetitions } from "@/actions/competitions";
import { CreateCompetitionDialog } from "./create-competition-dialog";
import type { Competition, CompetitionStatus } from "@/types/competition";

const statusLabels: Record<CompetitionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
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

  useEffect(() => {
    if (!isPending) {
      loadCompetitions();
    }
  }, [isPending]);

  async function loadCompetitions() {
    try {
      setIsLoading(true);
      const data = await listCompetitions(0, 100);
      // TODO: Filtrar por organization_slug quando o backend suportar
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
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
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
                <Card
                  key={competition.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{competition.name}</CardTitle>
                      <Badge variant={statusLabels[competition.status].variant}>
                        {statusLabels[competition.status].label}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Trophy className="w-3 h-3" />
                      {competition.system === "points"
                        ? "Pontos Corridos"
                        : competition.system === "elimination"
                        ? "Eliminatória"
                        : "Misto"}
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
    </>
  );
}
