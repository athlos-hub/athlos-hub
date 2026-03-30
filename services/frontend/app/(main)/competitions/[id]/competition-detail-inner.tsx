"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Zap, 
  Layers,
  ArrowLeft,
  TableProperties,
  BarChart3,
  CalendarDays,
  Shield,
  Building2,
  Filter,
  Play,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCompetition, getCompetitionTeamsWithPlayers, getCompetitionStats, generateCompetitionStructure, finalizeCompetition } from "@/actions/competitions";
import { 
  getCompetitionStandings, 
  getPlayerRankings,
  getCompetitionMatches 
} from "@/actions/rankings";
import { getOrganizationBySlug } from "@/actions/organizations";
import type { Competition, CompetitionPhase } from "@/types/competition";
import { CompetitionStatus } from "@/types/competition";
import type { StandingsTeam, PlayerRanking } from "@/actions/rankings";
import { OrgRole } from "@/types/organization";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";
import { EditMatchDialog } from "@/components/matches/edit-match-dialog";
import { Edit } from "lucide-react";

const COMPETITION_TABS = ["standings", "teams", "stats", "matches"] as const;
type CompetitionTab = (typeof COMPETITION_TABS)[number];

export function CompetitionDetailPageInner() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const competitionId = parseInt(params?.id as string);
  const { data: session } = useSession();

  const tabParam = searchParams.get("tab");
  const activeTab: CompetitionTab = COMPETITION_TABS.includes(tabParam as CompetitionTab)
    ? (tabParam as CompetitionTab)
    : "standings";

  const setActiveTab = (value: string) => {
    const next: CompetitionTab = COMPETITION_TABS.includes(value as CompetitionTab)
      ? (value as CompetitionTab)
      : "standings";
    const paramsNext = new URLSearchParams(searchParams.toString());
    paramsNext.set("tab", next);
    router.replace(`${pathname}?${paramsNext.toString()}`, { scroll: false });
  };

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<StandingsTeam[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]); // Todos os jogos sem filtro
  const [teams, setTeams] = useState<any[]>([]);
  const [competitionStats, setCompetitionStats] = useState<any[]>([]);
  const [selectedStat, setSelectedStat] = useState<string>("");
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  
  // Filtros de jogos
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>("all");
  const [matchPeriodFilter, setMatchPeriodFilter] = useState<string>("all");

  useEffect(() => {
    if (competitionId) {
      loadCompetitionData();
    }
  }, [competitionId]);

  const loadCompetitionData = async () => {
    setIsLoading(true);
    try {
      // Carregar dados da competição
      const compData = await getCompetition(competitionId);
      setCompetition(compData);

      // Verificar role do usuário na organização
      if (session && compData.organization_slug) {
        try {
          const orgData = await getOrganizationBySlug(compData.organization_slug, true);
          if ('role' in orgData) {
            setUserRole(orgData.role);
          }
        } catch (error) {
          console.error("Erro ao verificar role do usuário:", error);
        }
      }

      // Carregar standings
      try {
        const standingsData = await getCompetitionStandings(competitionId);
        setStandings(standingsData);
      } catch (error) {
        console.log("Standings não disponíveis ainda");
      }

      // Carregar matches
      try {
        const matchesData = await getCompetitionMatches(competitionId);
        console.log("Matches carregados:", matchesData);
        setAllMatches(matchesData);
        setMatches(matchesData);
      } catch (error) {
        console.log("Jogos não disponíveis ainda");
      }

      // Carregar times
      try {
        const teamsData = await getCompetitionTeamsWithPlayers(competitionId);
        console.log("Times carregados:", teamsData);
        setTeams(teamsData);
      } catch (error) {
        console.log("Times não disponíveis ainda");
      }

      // Carregar estatísticas da competição
      try {
        const statsData = await getCompetitionStats(competitionId);
        console.log("Estatísticas carregadas:", statsData);
        setCompetitionStats(statsData);
        if (statsData.length > 0) {
          setSelectedStat(statsData[0].abbreviation);
        }
      } catch (error) {
        console.log("Estatísticas não disponíveis ainda");
      }

    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar competição";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case "points":
        return <Target className="w-5 h-5" />;
      case "elimination":
        return <Zap className="w-5 h-5" />;
      case "mixed":
        return <Layers className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
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

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      started: "Em Andamento",
      finished: "Finalizada",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      started: "bg-green-100 text-green-800",
      finished: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string, formatStr: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return format(date, formatStr, { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função para carregar rankings de uma estatística específica
  const loadPlayerRankingsForStat = async (statAbbreviation: string) => {
    if (!statAbbreviation) return;
    try {
      const rankings = await getPlayerRankings(competitionId, statAbbreviation, 20);
      setPlayerRankings(rankings);
    } catch (error) {
      console.error("Erro ao carregar rankings:", error);
      setPlayerRankings([]);
    }
  };

  // Funções para controlar o status da competição
  const handleStartCompetition = async () => {
    if (!competition) {
      toast.error("Competição não carregada");
      return;
    }

    // Validações antes de iniciar
    if (!teams || teams.length < 2) {
      toast.error("É necessário ter pelo menos 2 times inscritos para iniciar a competição");
      return;
    }

    if (!competition.organization_slug) {
      toast.error("Informações da organização não encontradas");
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      // Buscar o organization_id através do slug
      const organization = await getOrganizationBySlug(competition.organization_slug, true);
      
      if (!organization.id) {
        toast.error("ID da organização não encontrado");
        return;
      }
      
      // Gerar estrutura da competição (grupos e partidas)
      await generateCompetitionStructure(competitionId, {
        organization_id: organization.id
      });
      toast.success("Competição iniciada e estrutura gerada com sucesso!");
      await loadCompetitionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar competição";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFinishCompetition = async () => {
    if (!competition) return;
    
    setIsUpdatingStatus(true);
    try {
      await finalizeCompetition(competitionId);
      toast.success("Competição finalizada com sucesso!");
      await loadCompetitionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao finalizar competição";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Verificar se o usuário pode gerenciar a competição
  // Apenas OWNER e ORGANIZER podem gerenciar
  const canManageCompetition = session && (userRole === OrgRole.OWNER || userRole === OrgRole.ORGANIZER);

  // Efeito para carregar rankings quando mudar a estatística selecionada
  useEffect(() => {
    if (selectedStat && activeTab === "stats") {
      loadPlayerRankingsForStat(selectedStat);
    }
  }, [selectedStat, activeTab]);

  // Efeito para filtrar jogos
  useEffect(() => {
    let filtered = [...allMatches];

    // Filtrar por status
    if (matchStatusFilter !== "all") {
      filtered = filtered.filter((match) => {
        const status = match.status?.toLowerCase();
        if (matchStatusFilter === "scheduled") {
          return status === "scheduled" || status === "pending";
        }
        if (matchStatusFilter === "live") {
          return status === "live";
        }
        if (matchStatusFilter === "finished") {
          return status === "finished";
        }
        return true;
      });
    }

    // Filtrar por período
    if (matchPeriodFilter !== "all" && filtered.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);

      filtered = filtered.filter((match) => {
        if (!match.scheduled_datetime) return false;
        const matchDate = new Date(match.scheduled_datetime);

        if (matchPeriodFilter === "today") {
          return matchDate >= today && matchDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }
        if (matchPeriodFilter === "week") {
          return matchDate >= today && matchDate < weekFromNow;
        }
        if (matchPeriodFilter === "month") {
          return matchDate >= today && matchDate < monthFromNow;
        }
        return true;
      });
    }

    setMatches(filtered);
  }, [matchStatusFilter, matchPeriodFilter, allMatches]);

  const getMatchStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Agendado",
      scheduled: "Agendado",
      live: "Ao Vivo",
      finished: "Finalizado",
      canceled: "Cancelado",
    };
    return labels[status?.toLowerCase()] || status || "Não definido";
  };

  const getMatchStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      live: "bg-green-100 text-green-800",
      finished: "bg-gray-100 text-gray-800",
      canceled: "bg-red-100 text-red-800",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main"></div>
        </div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Competição não encontrada
          </h3>
          <Link href="/competitions">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para competições
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasStandings = standings.length > 0;
  const hasMatches = matches.length > 0;
  const hasTeams = teams.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Botão Voltar */}
        <Link href="/competitions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        {/* Cabeçalho da Competição */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Trophy className="w-8 h-8 text-main" />
                <h1 className="text-3xl font-bold text-gray-900">
                  {competition.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(competition.status)}`}
                >
                  {getStatusLabel(competition.status)}
                </span>
                
                {/* Botões de Controle - Apenas para owner/organizador */}
                {canManageCompetition && (
                  <div className="flex gap-2 ml-auto">
                    {competition.status === "pending" && (
                      <Button 
                        onClick={handleStartCompetition}
                        disabled={isUpdatingStatus}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isUpdatingStatus ? "Iniciando..." : "Iniciar Competição"}
                      </Button>
                    )}
                    {competition.status === "started" && (
                      <Button 
                        onClick={handleFinishCompetition}
                        disabled={isUpdatingStatus}
                        size="sm"
                        variant="destructive"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        {isUpdatingStatus ? "Finalizando..." : "Finalizar Competição"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Período</div>
                    <div className="font-medium">
                      {formatDate(competition.start_date, "dd/MM/yyyy")}
                      {" - "}
                      {formatDate(competition.end_date, "dd/MM/yyyy")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Jogadores por equipe</div>
                    <div className="font-medium">
                      {competition.min_members_per_team} - {competition.max_members_per_team}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  {getSystemIcon(competition.system)}
                  <div>
                    <div className="text-xs text-gray-500">Sistema</div>
                    <div className="font-medium">{getSystemLabel(competition.system)}</div>
                    {competition.system === "mixed" && competition.current_phase && (
                      <div className="text-xs text-gray-500">
                        {getPhaseLabel(competition.current_phase)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs com Conteúdo */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="standings" className="flex items-center gap-2">
                <TableProperties className="w-4 h-4" />
                Classificação
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Times
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Estatísticas
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Jogos
              </TabsTrigger>
            </TabsList>

            {/* Tabela de Classificação */}
            <TabsContent value="standings" className="mt-6">
              {hasStandings ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">J</TableHead>
                        <TableHead className="text-center">V</TableHead>
                        <TableHead className="text-center">E</TableHead>
                        <TableHead className="text-center">D</TableHead>
                        <TableHead className="text-center">GP</TableHead>
                        <TableHead className="text-center">GC</TableHead>
                        <TableHead className="text-center">SG</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((team, index) => (
                        <TableRow key={team.team_id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{team.team_name}</div>
                              <div className="text-xs text-gray-500">{team.team_abbreviation}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold">{team.points}</TableCell>
                          <TableCell className="text-center">{team.matches_played}</TableCell>
                          <TableCell className="text-center">{team.wins}</TableCell>
                          <TableCell className="text-center">{team.draws}</TableCell>
                          <TableCell className="text-center">{team.losses}</TableCell>
                          <TableCell className="text-center">{team.goals_for || 0}</TableCell>
                          <TableCell className="text-center">{team.goals_against || 0}</TableCell>
                          <TableCell className="text-center font-medium">
                            {team.goal_difference || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Image
                      src="/logo.svg"
                      alt="AthlosHub"
                      width={120}
                      height={30}
                      className="opacity-20"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Tabela não disponível
                      </h3>
                      <p className="text-gray-600">
                        A classificação será exibida quando a competição for iniciada
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Times */}
            <TabsContent value="teams" className="mt-6">
              {hasTeams ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <Card key={team.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-main/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-6 h-6 text-main" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1">{team.name}</h3>
                          <div className="text-sm text-gray-500 mb-3">
                            {team.abbreviation}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{team.players?.length || 0} jogadores</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Shield className="w-16 h-16 text-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum time inscrito
                      </h3>
                      <p className="text-gray-600">
                        Os times serão exibidos quando se inscreverem na competição
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Estatísticas */}
            <TabsContent value="stats" className="mt-6">
              {competitionStats.length > 0 ? (
                <div className="space-y-4">
                  {/* Select de Estatística */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Selecione a estatística:
                    </label>
                    <Select value={selectedStat} onValueChange={setSelectedStat}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Escolha uma estatística" />
                      </SelectTrigger>
                      <SelectContent>
                        {competitionStats.map((stat) => (
                          <SelectItem key={stat.id} value={stat.abbreviation}>
                            {stat.name} ({stat.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabela de Rankings */}
                  {playerRankings.length > 0 ? (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Jogador</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playerRankings.map((ranking, index) => (
                            <TableRow key={ranking.player_id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{ranking.player_name}</TableCell>
                              <TableCell>{ranking.team_name}</TableCell>
                              <TableCell className="text-center font-bold">{ranking.stat_value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-gray-600">Nenhum dado disponível para esta estatística ainda</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <BarChart3 className="w-16 h-16 text-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Estatísticas não configuradas
                      </h3>
                      <p className="text-gray-600">
                        As estatísticas serão exibidas quando forem configuradas para esta competição
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Jogos */}
            <TabsContent value="matches" className="mt-6">
              {/* Filtros */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtros:</span>
                </div>
                
                <Select value={matchStatusFilter} onValueChange={setMatchStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="scheduled">Agendados</SelectItem>
                    <SelectItem value="live">Ao Vivo</SelectItem>
                    <SelectItem value="finished">Finalizados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={matchPeriodFilter} onValueChange={setMatchPeriodFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                  </SelectContent>
                </Select>

                {(matchStatusFilter !== "all" || matchPeriodFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMatchStatusFilter("all");
                      setMatchPeriodFilter("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {hasMatches ? (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <Card key={match.id} className="p-5 hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 pb-3 border-b">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                                {getMatchStatusLabel(match.status)}
                              </span>
                              {match.round_name && (
                                <span className="text-xs text-gray-500">{match.round_name}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {match.scheduled_datetime ? (
                                <span>{formatDate(match.scheduled_datetime, "dd/MM/yyyy 'às' HH:mm")}</span>
                              ) : (
                                <span className="text-gray-400 italic">Data não definida</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              {match.local ? (
                                <span>{match.local}</span>
                              ) : (
                                <span className="text-gray-400 italic">Local não definido</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                          <div className="flex-1 flex items-center justify-end gap-3">
                            <div className="text-right">
                              <div className="font-semibold text-gray-900 text-lg">
                                {match.home_team_name || match.home_team?.name || "Time A"}
                              </div>
                              {(match.home_team_abbreviation || match.home_team?.abbreviation) && (
                                <div className="text-xs text-gray-500">
                                  {match.home_team_abbreviation || match.home_team?.abbreviation}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 px-6">
                            <div className="text-4xl font-bold text-gray-900">
                              {match.home_score ?? "-"}
                            </div>
                            <div className="text-2xl text-gray-400 font-light">×</div>
                            <div className="text-4xl font-bold text-gray-900">
                              {match.away_score ?? "-"}
                            </div>
                          </div>
                          
                          <div className="flex-1 flex items-center gap-3">
                            <div className="text-left">
                              <div className="font-semibold text-gray-900 text-lg">
                                {match.away_team_name || match.away_team?.name || "Time B"}
                              </div>
                              {(match.away_team_abbreviation || match.away_team?.abbreviation) && (
                                <div className="text-xs text-gray-500">
                                  {match.away_team_abbreviation || match.away_team?.abbreviation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t flex gap-2">
                          <Link href={`/partidas/${match.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              Ficha da partida
                            </Button>
                          </Link>
                          {canManageCompetition && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingMatch(match)}
                              className="px-3"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <CalendarDays className="w-16 h-16 text-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum jogo agendado
                      </h3>
                      <p className="text-gray-600">
                        Os jogos serão exibidos quando forem criados
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Modal de Edição de Jogo */}
      {editingMatch && (
        <EditMatchDialog
          open={!!editingMatch}
          onOpenChange={(open) => !open && setEditingMatch(null)}
          match={editingMatch}
          onSuccess={loadCompetitionData}
        />
      )}
    </div>
  );
}
