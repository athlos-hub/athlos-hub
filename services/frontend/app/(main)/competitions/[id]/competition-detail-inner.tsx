"use client";

import { useEffect, useMemo, useState } from "react";
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
  Square,
  Plus,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCompetition,
  getCompetitionTeamsWithPlayers,
  getCompetitionStats,
  generateCompetitionStructure,
  finalizeCompetition,
  updateCompetition,
  deleteCompetition,
  listSportRulesets,
  getCompetitionStatsRuleset,
  createStatsRulesetForCompetition,
  addStatTypeToRuleset,
  updateStatTypeInRuleset,
  deleteStatTypeFromRuleset,
} from "@/actions/competitions";
import { 
  getCompetitionStandings, 
  getPlayerRankings,
  getCompetitionMatches 
} from "@/actions/rankings";
import { getOrganizationBySlug } from "@/actions/organizations";
import type { Competition, CompetitionPhase, CompetitionStat } from "@/types/competition";
import { CompetitionStatus, CompetitionSystem } from "@/types/competition";
import type { StandingsTeam, PlayerRanking } from "@/actions/rankings";
import { OrgRole } from "@/types/organization";
import { CompetitionManagementDialogs } from "@/components/organizations/competition-management-dialogs";
import { CompetitionTeamCard } from "@/components/teams/competition-team-card";
import { TeamLogo } from "@/components/teams/team-logo";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { getMyTeams } from "@/actions/teams";
import type { TeamListItem } from "@/types/team";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { EditMatchDialog } from "@/components/matches/edit-match-dialog";
import { Edit } from "lucide-react";

const COMPETITION_TABS = ["standings", "teams", "stats", "matches"] as const;
type CompetitionTab = (typeof COMPETITION_TABS)[number];

export function CompetitionDetailPageInner() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const competitionId = params?.id as string;
  const { data: session } = useSession();

  const tabParam = searchParams.get("tab");
  const activeTab: CompetitionTab = COMPETITION_TABS.includes(tabParam as CompetitionTab)
    ? (tabParam as CompetitionTab)
    : "standings";

  const [showStatsTab, setShowStatsTab] = useState(true);

  const setActiveTab = (value: string) => {
    if (value === "stats" && !showStatsTab) {
      return;
    }
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
  const [competitionStats, setCompetitionStats] = useState<CompetitionStat[]>([]);
  const [statsRulesetId, setStatsRulesetId] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>("");
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [isSavingStat, setIsSavingStat] = useState(false);
  const [isStatDialogOpen, setIsStatDialogOpen] = useState(false);
  const [statToDelete, setStatToDelete] = useState<CompetitionStat | null>(null);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [statForm, setStatForm] = useState({
    name: "",
    abbreviation: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [myTeams, setMyTeams] = useState<TeamListItem[]>([]);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingCompetition, setIsSavingCompetition] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [isCompetitionEditDialogOpen, setIsCompetitionEditDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<Competition | null>(null);
  const [sportRulesets, setSportRulesets] = useState<any[]>([]);
  const [editingRules, setEditingRules] = useState({
    canEditBeforeStart: false,
    canEditMembers: false,
    canSetStatsNone: false,
    canSetStatsNew: false,
  });
  const [editingCompetitionForm, setEditingCompetitionForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    min_members_per_team: 1,
    max_members_per_team: 1,
    system: "points" as CompetitionSystem,
    sport_ruleset_id: "",
    stats_ruleset_mode: "keep" as "keep" | "none" | "new",
  });
  
  // Filtros de jogos
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>("all");
  const [matchPeriodFilter, setMatchPeriodFilter] = useState<string>("all");

  /** Mesmo escudo da aba Times para classificação e jogos (id = time no competitions). */
  const teamLogoByCompetitionTeamId = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      const row = t as { id?: string; logo_url?: string | null; logoUrl?: string | null };
      const url =
        (typeof row.logo_url === "string" && row.logo_url.trim()) ||
        (typeof row.logoUrl === "string" && row.logoUrl.trim()) ||
        "";
      if (url) m.set(String(row.id), url);
    }
    return m;
  }, [teams]);

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

      try {
        const mine = await getMyTeams();
        setMyTeams(mine);
      } catch {
        setMyTeams([]);
      }

      // Verificar role do usuário na organização
      if (session && compData.organization_slug) {
        try {
          const orgData = await getOrganizationBySlug(compData.organization_slug, true);
          if ("name" in orgData && typeof orgData.name === "string") {
            setOrganizationName(orgData.name);
          }
          if ("role" in orgData) {
            setUserRole(orgData.role);
          }
        } catch (error) {
          console.error("Erro ao verificar role do usuário:", error);
        }
      } else {
        setOrganizationName(null);
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
        const statsRuleset = await getCompetitionStatsRuleset(competitionId);
        setStatsRulesetId(statsRuleset?.id ?? null);
        setShowStatsTab(!!statsRuleset);

        const statsData = await getCompetitionStats(competitionId);
        console.log("Estatísticas carregadas:", statsData);
        setCompetitionStats(statsData);
        if (statsData.length > 0 && !selectedStat) {
          setSelectedStat(statsData[0].abbreviation);
        }
      } catch (error) {
        console.log("Estatísticas não disponíveis ainda");
        setStatsRulesetId(null);
        setShowStatsTab(false);
        setCompetitionStats([]);
        setSelectedStat("");
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
      mixed: "Grupos + Mata-mata",
    };
    return labels[system] || "Sistema não definido";
  };

  const getPhaseLabel = (phase?: CompetitionPhase): string => {
    if (!phase) return "";
    const labels = {
      groups: "Fase de Grupos",
      elimination: "Fase Eliminatória",
    };
    return labels[phase] || "Fase não definida";
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Não iniciado",
      started: "Em Andamento",
      finished: "Finalizada",
    };
    return labels[status] || "Status não definido";
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

  const resetStatForm = () => {
    setStatForm({
      name: "",
      abbreviation: "",
      description: "",
    });
    setEditingStatId(null);
  };

  const handleOpenCreateStatDialog = () => {
    resetStatForm();
    setIsStatDialogOpen(true);
  };

  const handleSaveStat = async () => {
    if (!statForm.name.trim() || !statForm.abbreviation.trim()) {
      toast.error("Informe nome e abreviação da estatística");
      return;
    }

    setIsSavingStat(true);
    try {
      const payload = {
        name: statForm.name.trim(),
        abbreviation: statForm.abbreviation.trim().toUpperCase(),
        description: statForm.description.trim() || undefined,
        display_order: editingStatId
          ? competitionStats.find((s) => s.id === editingStatId)?.display_order ?? 0
          : competitionStats.length + 1,
      };

      if (!statsRulesetId) {
        toast.error("Esta competição está sem conjunto de estatísticas.");
        return;
      }
      const rulesetId = statsRulesetId;

      if (editingStatId) {
        await updateStatTypeInRuleset(rulesetId, editingStatId, payload);
        toast.success("Estatística atualizada");
      } else {
        await addStatTypeToRuleset(rulesetId, payload);
        toast.success("Estatística adicionada");
      }

      const updatedStats = await getCompetitionStats(competitionId);
      setCompetitionStats(updatedStats);
      if (!selectedStat && updatedStats.length > 0) {
        setSelectedStat(updatedStats[0].abbreviation);
      }
      resetStatForm();
      setIsStatDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar estatística";
      toast.error(message);
    } finally {
      setIsSavingStat(false);
    }
  };

  const handleEditStat = (stat: CompetitionStat) => {
    setEditingStatId(stat.id);
    setStatForm({
      name: stat.name ?? "",
      abbreviation: stat.abbreviation ?? "",
      description: stat.description ?? "",
    });
    setIsStatDialogOpen(true);
  };

  const handleDeleteStat = (stat: CompetitionStat) => {
    setStatToDelete(stat);
  };

  const handleConfirmDeleteStat = async () => {
    if (!statToDelete) {
      return;
    }

    if (!statsRulesetId) {
      toast.error("Ruleset de estatísticas não encontrado");
      return;
    }

    try {
      await deleteStatTypeFromRuleset(statsRulesetId, statToDelete.id);
      const updatedStats = await getCompetitionStats(competitionId);
      setCompetitionStats(updatedStats);
      if (selectedStat === statToDelete.abbreviation) {
        setSelectedStat(updatedStats[0]?.abbreviation ?? "");
      }
      toast.success("Estatística removida");
      setStatToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover estatística";
      toast.error(message);
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

  const openCompetitionEditDialog = async () => {
    if (!competition) return;
    try {
      const slug = competition.organization_slug;
      let rulesets = slug ? await listSportRulesets(0, 100, slug) : [];
      if (
        competition.sport_ruleset &&
        !rulesets.some((r) => String(r.id) === String(competition.sport_ruleset!.id))
      ) {
        rulesets = [competition.sport_ruleset, ...rulesets];
      }
      setSportRulesets(rulesets);

      const hasStatsRuleset = !!competition.stats_ruleset;
      const statsCount = competition.stats_ruleset?.stats_types?.length ?? 0;
      const canEditBeforeStart = competition.status === CompetitionStatus.PENDING;
      const canEditMembers = teams.length === 0;

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

      setEditingCompetitionForm({
        name: competition.name,
        start_date: toDatetimeLocal(competition.start_date),
        end_date: toDatetimeLocal(competition.end_date),
        min_members_per_team: competition.min_members_per_team,
        max_members_per_team: competition.max_members_per_team,
        system: competition.system,
        sport_ruleset_id: competition.sport_ruleset_id ? String(competition.sport_ruleset_id) : "",
        stats_ruleset_mode: "keep",
      });

      setIsCompetitionEditDialogOpen(true);
    } catch {
      toast.error("Erro ao preparar edição da competição");
    }
  };

  const handleSaveCompetition = async () => {
    if (!competition) return;
    const name = editingCompetitionForm.name.trim();
    if (!name) {
      toast.error("Informe o nome da competição");
      return;
    }

    setIsSavingCompetition(true);
    try {
      await updateCompetition(competition.id, {
        name,
        start_date: editingCompetitionForm.start_date || undefined,
        end_date: editingCompetitionForm.end_date || undefined,
        min_members_per_team: editingRules.canEditMembers ? editingCompetitionForm.min_members_per_team : undefined,
        max_members_per_team: editingRules.canEditMembers ? editingCompetitionForm.max_members_per_team : undefined,
        system: editingRules.canEditBeforeStart ? (editingCompetitionForm.system as Competition["system"]) : undefined,
        sport_ruleset_id: editingRules.canEditBeforeStart
          ? (editingCompetitionForm.sport_ruleset_id || undefined)
          : undefined,
        stats_ruleset_mode: editingRules.canEditBeforeStart ? editingCompetitionForm.stats_ruleset_mode : "keep",
      });
      toast.success("Competição atualizada com sucesso");
      setIsCompetitionEditDialogOpen(false);
      await loadCompetitionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar competição";
      toast.error(message);
    } finally {
      setIsSavingCompetition(false);
    }
  };

  const handleConfirmDeleteCompetition = async () => {
    if (!competitionToDelete) return;
    try {
      await deleteCompetition(competitionToDelete.id);
      toast.success("Competição excluída com sucesso");
      router.push("/competitions");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir competição";
      toast.error(message);
    } finally {
      setCompetitionToDelete(null);
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
    return labels[status?.toLowerCase()] || "Status não definido";
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
  const effectiveTab: CompetitionTab = activeTab === "stats" && !showStatsTab ? "standings" : activeTab;

  const myTeamInCompetition = myTeams.find(
    (t) => String(t.competition_id) === String(competitionId)
  );
  const canShowPlayerCreateTeam =
    !!session &&
    competition.status === CompetitionStatus.PENDING &&
    userRole !== null &&
    !myTeamInCompetition &&
    !!competition.organization_slug;

  return (
    <div className="container mx-auto">
      <div className="space-y-6">
        {/* Botão Voltar */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalhes da Competição</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as informações da competição
          </p>
        </div>

        {/* Cabeçalho da Competição */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Trophy className="w-7 h-7 text-main" />
                <h1 className="text-xl font-bold text-gray-900">
                  {competition.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(competition.status)}`}
                >
                  {getStatusLabel(competition.status)}
                </span>
                
                {/* Botões de Controle - Apenas para owner/organizador */}
                {canManageCompetition && (
                  <div className="flex gap-2 ml-auto">
                    <Button
                      onClick={openCompetitionEditDialog}
                      size="sm"
                      variant="outline"
                    >
                      Editar competição
                    </Button>
                    <Button
                      onClick={() => setCompetitionToDelete(competition)}
                      size="sm"
                      variant="destructive"
                    >
                      Excluir competição
                    </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Período</div>
                    <div className="text-sm font-medium">
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
                    <div className="text-sm font-medium">
                      {competition.min_members_per_team} - {competition.max_members_per_team}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  {getSystemIcon(competition.system)}
                  <div>
                    <div className="text-xs text-gray-500">Sistema</div>
                    <div className="text-sm font-medium">{getSystemLabel(competition.system)}</div>
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

        {session &&
          competition.status === CompetitionStatus.PENDING &&
          userRole !== null &&
          (myTeamInCompetition || canShowPlayerCreateTeam) && (
            <Card className="p-4 border-dashed">
              {myTeamInCompetition ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    Você já participa de um time nesta competição. Não é possível criar outro time nem se inscrever em outro time neste campeonato.
                  </p>
                  <Link
                    href={`/clubes/${myTeamInCompetition.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0"
                    )}
                  >
                    Ver meu time
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    Inscreva um time nesta competição (inscrições abertas).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-main hover:bg-main/90 text-white shrink-0"
                    onClick={() => setCreateTeamOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar time
                  </Button>
                </div>
              )}
            </Card>
          )}

        {/* Tabs com Conteúdo */}
        <Card className="p-6">
          <Tabs value={effectiveTab} onValueChange={setActiveTab}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("standings")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "standings"
                        ? "bg-main text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <TableProperties className="w-4 h-4" />
                      Classificação
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("teams")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "teams"
                        ? "bg-main text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Times
                    </span>
                  </button>
                  {showStatsTab && (
                    <button
                      onClick={() => setActiveTab("stats")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        effectiveTab === "stats"
                          ? "bg-main text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Estatísticas
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("matches")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "matches"
                        ? "bg-main text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Jogos
                    </span>
                  </button>
                </div>
              </div>
            </div>

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
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamLogo
                                name={team.team_name}
                                abbreviation={team.team_abbreviation || "?"}
                                logoUrl={
                                  teamLogoByCompetitionTeamId.get(String(team.team_id)) ??
                                  team.team_logo_url ??
                                  null
                                }
                                className="h-9 w-9"
                                textClassName="text-xs"
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{team.team_name}</div>
                                {team.team_abbreviation && (
                                  <div className="text-xs text-gray-500">{team.team_abbreviation}</div>
                                )}
                              </div>
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
                    <TableProperties className="w-16 h-16 text-gray-300" />
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
                    <CompetitionTeamCard
                      key={team.id}
                      team={team}
                      organizationSlug={competition.organization_slug}
                      organizationName={organizationName ?? undefined}
                    />
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
                      <p className="text-gray-600 mb-4">
                        Os times serão exibidos quando se inscreverem na competição
                      </p>
                      {canShowPlayerCreateTeam && (
                        <Button
                          type="button"
                          className="bg-main hover:bg-main/90 text-white"
                          onClick={() => setCreateTeamOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Criar time nesta competição
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Estatísticas */}
            <TabsContent value="stats" className="mt-6">
              <div className="space-y-6">
                {canManageCompetition && showStatsTab && (
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Configurar estatísticas da competição
                          </h3>
                          <p className="text-sm text-gray-600">
                            Adicione e gerencie as métricas que serão usadas no ranking e nos eventos de jogo.
                          </p>
                        </div>
                        <Button
                          onClick={handleOpenCreateStatDialog}
                          className="bg-main hover:bg-main/90 text-white"
                        >
                          Nova estatística
                        </Button>
                      </div>

                      {competitionStats.length > 0 && (
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Abrev.</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {competitionStats.map((stat) => (
                                <TableRow key={stat.id}>
                                  <TableCell className="font-medium">{stat.name}</TableCell>
                                  <TableCell>{stat.abbreviation}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditStat(stat)}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteStat(stat)}
                                      >
                                        Excluir
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {competitionStats.length > 0 ? (
                  <div className="space-y-4">
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
                          {!showStatsTab
                            ? "Esta competição foi configurada sem conjunto de estatísticas."
                            : canManageCompetition
                            ? "Use o formulário acima para adicionar as primeiras métricas."
                            : "As estatísticas serão exibidas quando forem configuradas para esta competição."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                          <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                            <div className="text-right min-w-0">
                              <div className="font-semibold text-gray-900 text-lg truncate">
                                {match.home_team_name || match.home_team?.name || "Time A"}
                              </div>
                              {(match.home_team_abbreviation || match.home_team?.abbreviation) && (
                                <div className="text-xs text-gray-500">
                                  {match.home_team_abbreviation || match.home_team?.abbreviation}
                                </div>
                              )}
                            </div>
                            <TeamLogo
                              name={match.home_team_name || match.home_team?.name || "Time A"}
                              abbreviation={
                                match.home_team_abbreviation ||
                                match.home_team?.abbreviation ||
                                "?"
                              }
                              logoUrl={
                                (match.home_team?.id != null
                                  ? teamLogoByCompetitionTeamId.get(
                                      String(match.home_team.id)
                                    )
                                  : undefined) ??
                                match.home_team?.logo_url ??
                                match.home_team?.logo ??
                                null
                              }
                              className="h-10 w-10 shrink-0"
                              textClassName="text-xs"
                            />
                          </div>
                          
                          <div className="flex items-center gap-3 px-6 shrink-0">
                            <div className="text-4xl font-bold text-gray-900">
                              {match.home_score ?? "-"}
                            </div>
                            <div className="text-2xl text-gray-400 font-light">×</div>
                            <div className="text-4xl font-bold text-gray-900">
                              {match.away_score ?? "-"}
                            </div>
                          </div>
                          
                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            <TeamLogo
                              name={match.away_team_name || match.away_team?.name || "Time B"}
                              abbreviation={
                                match.away_team_abbreviation ||
                                match.away_team?.abbreviation ||
                                "?"
                              }
                              logoUrl={
                                (match.away_team?.id != null
                                  ? teamLogoByCompetitionTeamId.get(
                                      String(match.away_team.id)
                                    )
                                  : undefined) ??
                                match.away_team?.logo_url ??
                                match.away_team?.logo ??
                                null
                              }
                              className="h-10 w-10 shrink-0"
                              textClassName="text-xs"
                            />
                            <div className="text-left min-w-0">
                              <div className="font-semibold text-gray-900 text-lg truncate">
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

      <Dialog
        open={isStatDialogOpen}
        onOpenChange={(open) => {
          setIsStatDialogOpen(open);
          if (!open) {
            resetStatForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStatId ? "Editar estatística" : "Nova estatística"}
            </DialogTitle>
            <DialogDescription>
              Configure as métricas que serão usadas no ranking e nos eventos da competição.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Nome (ex.: Gols)"
              value={statForm.name}
              onChange={(e) => setStatForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Abreviação (ex.: GOL)"
              value={statForm.abbreviation}
              onChange={(e) => setStatForm((prev) => ({ ...prev, abbreviation: e.target.value }))}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={statForm.description}
              onChange={(e) => setStatForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsStatDialogOpen(false);
                resetStatForm();
              }}
              disabled={isSavingStat}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveStat}
              disabled={isSavingStat}
              className="bg-main hover:bg-main/90 text-white"
            >
              {isSavingStat
                ? "Salvando..."
                : editingStatId
                ? "Atualizar estatística"
                : "Adicionar estatística"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!statToDelete}
        onOpenChange={(open) => {
          if (!open) setStatToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estatística</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tem certeza que deseja excluir a estatística "${statToDelete?.name ?? ""}"? Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteStat}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompetitionManagementDialogs
        editOpen={isCompetitionEditDialogOpen}
        onEditOpenChange={setIsCompetitionEditDialogOpen}
        deleteOpen={!!competitionToDelete}
        onDeleteOpenChange={(open) => {
          if (!open) setCompetitionToDelete(null);
        }}
        deleteCompetitionName={competitionToDelete?.name}
        form={editingCompetitionForm}
        setForm={setEditingCompetitionForm}
        rules={editingRules}
        sportRulesets={sportRulesets}
        isSaving={isSavingCompetition}
        onSave={handleSaveCompetition}
        onConfirmDelete={handleConfirmDeleteCompetition}
      />

      {competition.organization_slug && (
        <CreateTeamDialog
          open={createTeamOpen}
          onOpenChange={setCreateTeamOpen}
          fixedContext={{
            organizationSlug: competition.organization_slug,
            competition,
          }}
          onSuccess={(teamId) => {
            loadCompetitionData();
            router.push(`/clubes/${teamId}`);
          }}
        />
      )}
    </div>
  );
}
