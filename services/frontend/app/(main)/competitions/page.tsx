"use client";

import { useEffect, useState } from "react";
import { Trophy, Filter, Building2, Calendar, Users, Target, Zap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCompetitions } from "@/actions/competitions";
import { getOrganizations } from "@/actions/organizations";
import type { Competition, CompetitionStatus, CompetitionPhase } from "@/types/competition";
import type { OrganizationGetPublic } from "@/types/organization";
import { OrganizationPrivacy } from "@/types/organization";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompetitionsByOrganization {
  organization: OrganizationGetPublic;
  competitions: Competition[];
}

export default function CompetitionsPage() {
  const [competitionsByOrg, setCompetitionsByOrg] = useState<CompetitionsByOrganization[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationGetPublic[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Carregar organizações públicas uma vez no início
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Recarregar competições quando filtros mudarem
  useEffect(() => {
    if (organizations.length > 0) {
      loadCompetitions();
    }
  }, [selectedOrg, selectedStatus, organizations]);

  const loadOrganizations = async () => {
    try {
      const orgsData = await getOrganizations(OrganizationPrivacy.PUBLIC, 100);
      console.log("Organizações públicas carregadas:", orgsData);
      setOrganizations(orgsData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar organizações";
      toast.error(message);
      console.error("Erro ao carregar organizações:", error);
    }
  };

  const loadCompetitions = async () => {
    setIsLoading(true);
    try {
      // Para cada organização pública, buscar suas competições
      const grouped: CompetitionsByOrganization[] = [];
      
      for (const org of organizations) {
        // Buscar competições dessa organização
        const orgCompetitions = await listCompetitions(
          0,
          1000,
          org.slug,
          selectedStatus !== "all" ? selectedStatus : undefined
        );
        
        if (orgCompetitions.length > 0) {
          grouped.push({
            organization: org,
            competitions: orgCompetitions,
          });
        }
      }

      // Se há filtro de organização, aplicar
      if (selectedOrg !== "all") {
        const filtered = grouped.filter(g => g.organization.slug === selectedOrg);
        setCompetitionsByOrg(filtered);
      } else {
        setCompetitionsByOrg(grouped);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar competições";
      toast.error(message);
      console.error("Erro ao carregar competições:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: CompetitionStatus): string => {
    const labels = {
      pending: "Pendente",
      started: "Em Andamento",
      finished: "Finalizada",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: CompetitionStatus): string => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      started: "bg-green-100 text-green-800",
      finished: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case "points":
        return <Target className="w-4 h-4" />;
      case "elimination":
        return <Zap className="w-4 h-4" />;
      case "mixed":
        return <Layers className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getSystemLabel = (system: string): string => {
    const labels: Record<string, string> = {
      points: "Pontos Corridos",
      elimination: "Eliminatório",
      mixed: "Misto",
    };
    return labels[system] || system;
  };

  const getPhaseLabel = (phase?: CompetitionPhase): string => {
    if (!phase) return "";
    const labels = {
      groups: "Fase de Grupos",
      elimination: "Fase Eliminatória",
    };
    return labels[phase] || phase;
  };

  return (
    <div className="min-h-screen">
      <div className="container">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Competições</h1>
            <p className="text-muted-foreground mt-1">
              Explore todas as competições das organizações públicas
            </p>
          </div>

          {/* Filtros */}
          <Card className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtros:</span>
              </div>

              <div className="flex gap-3 flex-wrap flex-1">
                <div className="w-64">
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as organizações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as organizações</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.slug} value={org.slug}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-48">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="started">Em Andamento</SelectItem>
                      <SelectItem value="finished">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(selectedOrg !== "all" || selectedStatus !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedOrg("all");
                      setSelectedStatus("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main"></div>
            </div>
          )}

          {/* Competições agrupadas por organização */}
          {!isLoading && competitionsByOrg.length === 0 && (
            <Card className="p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma competição encontrada
              </h3>
              <p className="text-gray-600">
                Não há competições disponíveis com os filtros selecionados.
              </p>
            </Card>
          )}

          {!isLoading && competitionsByOrg.map(({ organization, competitions }) => (
            <div key={organization.slug} className="space-y-4">
              {/* Cabeçalho da Organização */}
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-main/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-main" />
                  </div>
                )}
                <div className="flex-1">
                  <Link
                    href={`/organizations/${organization.slug}`}
                    className="text-xl font-bold text-gray-900 hover:text-main transition-colors"
                  >
                    {organization.name}
                  </Link>
                  {organization.description && (
                    <p className="text-sm text-gray-600">{organization.description}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {competitions.length} {competitions.length === 1 ? "competição" : "competições"}
                </div>
              </div>

              {/* Lista de Competições */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {competitions.map((competition) => {
                  return (
                  <Card key={competition.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Link href={`/competitions/${competition.id}`}>
                      <div className="p-4 space-y-3">
                        {/* Nome e Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-gray-900 line-clamp-2">
                              {competition.name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(competition.status)}`}
                            >
                              {getStatusLabel(competition.status)}
                            </span>
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {format(new Date(competition.start_date), "dd/MM/yyyy", { locale: ptBR })}
                              {" - "}
                              {format(new Date(competition.end_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>
                              {competition.min_members_per_team} - {competition.max_members_per_team} jogadores
                            </span>
                          </div>
                        </div>

                        {/* Sistema */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="text-gray-500">{getSystemIcon(competition.system)}</div>
                            <span className="text-xs font-medium text-gray-500">
                              {getSystemLabel(competition.system)}
                            </span>
                          </div>
                          {competition.system === "mixed" && competition.current_phase && (
                            <div className="mt-1 text-xs text-gray-600">
                              <span className="font-medium">Fase:</span> {getPhaseLabel(competition.current_phase)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </Card>
                );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
