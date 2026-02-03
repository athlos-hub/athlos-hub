"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Calendar, Users, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listCompetitions } from "@/actions/competitions";
import type { Competition, CompetitionStatus } from "@/types/competition";

const statusLabels: Record<CompetitionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  started: { label: "Em Andamento", variant: "default" },
  finished: { label: "Finalizada", variant: "outline" },
};

export default function CompetitionsPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCompetitions();
  }, []);

  async function loadCompetitions() {
    try {
      setIsLoading(true);
      const data = await listCompetitions(0, 100);
      setCompetitions(data);
    } catch (error) {
      console.error("Erro ao carregar competições:", error);
      toast.error("Erro ao carregar competições");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCompetitions = competitions.filter((comp) =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Competições</h1>
          <p className="text-gray-600">Gerencie todas as competições da plataforma</p>
        </div>
        <Button
          onClick={() => router.push("/admin/competitions/new")}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Competição
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Competições</CardTitle>
          <CardDescription>
            {competitions.length} competição(ões) cadastrada(s)
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "Nenhuma competição encontrada"
                  : "Nenhuma competição cadastrada ainda"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCompetitions.map((competition) => (
                <Card
                  key={competition.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/admin/competitions/${competition.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{competition.name}</CardTitle>
                      <Badge variant={statusLabels[competition.status].variant}>
                        {statusLabels[competition.status].label}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {competition.system === "points"
                        ? "Pontos Corridos"
                        : competition.system === "elimination"
                        ? "Eliminatória"
                        : "Misto"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(competition.start_date).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(competition.end_date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {competition.min_members_per_team} - {competition.max_members_per_team}{" "}
                        jogadores por time
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
