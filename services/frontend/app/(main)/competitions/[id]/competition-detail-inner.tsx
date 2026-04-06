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
  getCompetitionHighlights,
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
import { listLives } from "@/actions/lives";
import { getUsersPublicInfoBatch } from "@/actions/auth";
import { formatUserProfileDisplayName } from "@/lib/user-display-name";
import type {
  Competition,
  CompetitionHighlights,
  CompetitionPhase,
  CompetitionStat,
} from "@/types/competition";
import { CompetitionStatus, CompetitionSystem } from "@/types/competition";
import type { StandingsTeam, PlayerRanking } from "@/actions/rankings";
import { OrgRole } from "@/types/organization";
import { CompetitionManagementDialogs } from "@/components/organizations/competition-management-dialogs";
import { CompetitionTeamCard } from "@/components/teams/competition-team-card";
import { TeamLogo } from "@/components/teams/team-logo";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { CompetitionPendingTeamsSection } from "@/components/competitions/competition-pending-teams-section";
import { getMyTeams } from "@/actions/teams";
import type { TeamListItem } from "@/types/team";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { EditMatchDialog } from "@/components/matches/edit-match-dialog";
import { Edit } from "lucide-react";
import { parseBackendIsoToDate } from "@/lib/datetime/parse-backend-iso";

const COMPETITION_TABS = ["standings", "teams", "stats", "matches"] as const;
type CompetitionTab = (typeof COMPETITION_TABS)[number];

export function CompetitionDetailPageInner() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const competitionId = params?.id as string;
  const { data: session, status: sessionStatus } = useSession();

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
  /** ID da organização (auth) para listar lives no live-service */
  const [organizationIdForLives, setOrganizationIdForLives] = useState<string | null>(null);
  /** match_id (competitions) → status da live (live-service), em minúsculas */
  const [liveStatusByMatchId, setLiveStatusByMatchId] = useState<Record<string, string>>({});
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [isCompetitionEditDialogOpen, setIsCompetitionEditDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<Competition | null>(null);
  const [competitionHighlights, setCompetitionHighlights] =
    useState<CompetitionHighlights | null>(null);
  const [highlightPlayerNameByKeycloakId, setHighlightPlayerNameByKeycloakId] = useState<
    Record<string, string>
  >({});
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

  /** Troca ?tab=standings se a competição for só eliminatória (sem tabela de pontos). */
  useEffect(() => {
    if (!competition) return;
    if (competition.system !== CompetitionSystem.ELIMINATION) return;
    if (tabParam !== "standings") return;
    const paramsNext = new URLSearchParams(searchParams.toString());
    paramsNext.set("tab", "teams");
    router.replace(`${pathname}?${paramsNext.toString()}`, { scroll: false });
  }, [competition, tabParam, pathname, router, searchParams]);

  /** ID público da organização (para GET /lives?organizationId=) */
  useEffect(() => {
    const slug = competition?.organization_slug;
    if (!slug) {
      setOrganizationIdForLives(null);
      return;
    }
    let cancelled = false;
    void getOrganizationBySlug(slug, false)
      .then((o) => {
        if (cancelled) return;
        if (o && typeof o === "object" && "id" in o && typeof o.id === "string") {
          setOrganizationIdForLives(o.id);
        } else {
          setOrganizationIdForLives(null);
        }
      })
      .catch(() => {
        if (!cancelled) setOrganizationIdForLives(null);
      });
    return () => {
      cancelled = true;
    };
  }, [competition?.organization_slug]);

  /** Status exibido na lista de jogos: prioriza live-service quando existir live para a partida */
  useEffect(() => {
    if (!organizationIdForLives) {
      setLiveStatusByMatchId({});
      return;
    }
    let cancelled = false;
    void listLives({ organizationId: organizationIdForLives })
      .then((lives) => {
        if (cancelled) return;
        const m: Record<string, string> = {};
        for (const live of lives) {
          const mid = String(live.externalMatchId ?? "");
          if (mid) m[mid] = String(live.status ?? "").toLowerCase();
        }
        setLiveStatusByMatchId(m);
      })
      .catch(() => {
        if (!cancelled) setLiveStatusByMatchId({});
      });
    return () => {
      cancelled = true;
    };
  }, [organizationIdForLives]);

  /** Papel na organização depende da sessão; na URL direta a sessão costuma chegar depois do 1º load. */
  useEffect(() => {
    const slug = competition?.organization_slug;
    if (!slug) {
      setOrganizationName(null);
      setUserRole(null);
      return;
    }

    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus !== "authenticated" || !session) {
      setUserRole(null);
      setOrganizationName(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const orgData = await getOrganizationBySlug(slug, true);
        if (cancelled) return;
        if ("name" in orgData && typeof orgData.name === "string") {
          setOrganizationName(orgData.name);
        } else {
          setOrganizationName(null);
        }
        if ("role" in orgData) {
          setUserRole(orgData.role as string);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Erro ao verificar role do usuário:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competition?.organization_slug, sessionStatus, session?.user?.id]);

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

      // Classificação por pontos: não aplica a competição só eliminatória
      if (compData.system !== CompetitionSystem.ELIMINATION) {
        try {
          const standingsData = await getCompetitionStandings(competitionId);
          setStandings(standingsData);
        } catch {
          setStandings([]);
        }
      } else {
        setStandings([]);
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

      if (compData.status === CompetitionStatus.FINISHED) {
        try {
          const h = await getCompetitionHighlights(competitionId);
          setCompetitionHighlights(h);
          const keycloakIds = [
            ...new Set(
              (h.stat_leaders ?? []).flatMap((block) =>
                (block.leaders ?? []).map((row) => String(row.player_keycloak_id ?? "").trim())
              )
            ),
          ].filter(Boolean);
          if (keycloakIds.length > 0) {
            const profiles = await getUsersPublicInfoBatch(keycloakIds);
            const map: Record<string, string> = {};
            for (const p of profiles) {
              const kid = String(p.keycloak_id ?? "").trim();
              if (kid) map[kid] = formatUserProfileDisplayName(p);
            }
            setHighlightPlayerNameByKeycloakId(map);
          } else {
            setHighlightPlayerNameByKeycloakId({});
          }
        } catch {
          setCompetitionHighlights(null);
          setHighlightPlayerNameByKeycloakId({});
        }
      } else {
        setCompetitionHighlights(null);
        setHighlightPlayerNameByKeycloakId({});
      }

    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar competição";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadCompetitionTeams = async () => {
    try {
      const teamsData = await getCompetitionTeamsWithPlayers(competitionId);
      setTeams(teamsData);
    } catch {
      setTeams([]);
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
      const date = parseBackendIsoToDate(dateString);
      if (isNaN(date.getTime())) return "Data inválida";
      return format(date, formatStr, { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  // Função para carregar rankings de uma estatística específica
  const loadPlayerRankingsForStat = async (statAbbreviation: string) => {
    if (!statAbbreviation) return;
    try {
      const raw = await getPlayerRankings(competitionId, statAbbreviation, 200);
      const normalized = raw.map((row) => {
        const r = row as PlayerRanking & { total_value?: number };
        const statVal = r.stat_value ?? r.total_value ?? 0;
        return {
          ...r,
          stat_value: typeof statVal === "number" ? statVal : Number(statVal) || 0,
          team_name: r.team_name ?? "",
        };
      });
      const keycloakIds = [
        ...new Set(
          normalized
            .map((r) => String(r.player_keycloak_id ?? "").trim())
            .filter(Boolean)
        ),
      ];
      const profiles =
        keycloakIds.length > 0 ? await getUsersPublicInfoBatch(keycloakIds) : [];
      const nameByKc = new Map<string, string>();
      for (const p of profiles) {
        const kid = String(p.keycloak_id ?? "").trim();
        if (kid) nameByKc.set(kid, formatUserProfileDisplayName(p));
      }
      const enriched: PlayerRanking[] = normalized
        .map((r) => {
          const kid = String(r.player_keycloak_id ?? "").trim();
          return {
            ...r,
            player_name:
              r.player_name?.trim() ||
              (kid ? nameByKc.get(kid) : undefined) ||
              "Jogador",
          };
        })
        .sort((a, b) => (b.stat_value ?? 0) - (a.stat_value ?? 0));
      setPlayerRankings(enriched);
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
    if (competition.status === CompetitionStatus.FINISHED) {
      toast.error("Competição finalizada não pode ser editada");
      return;
    }
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

  // Efeito para carregar rankings quando mudar a estatística selecionada
  useEffect(() => {
    if (selectedStat && activeTab === "stats") {
      loadPlayerRankingsForStat(selectedStat);
    }
  }, [selectedStat, activeTab]);

  const displayMatchStatus = (match: { id?: string; status?: string }) => {
    const mid = match?.id != null ? String(match.id) : "";
    const fromLive = mid ? liveStatusByMatchId[mid] : undefined;
    if (fromLive) return fromLive;
    return String(match?.status ?? "").toLowerCase();
  };

  // Efeito para filtrar jogos
  useEffect(() => {
    let filtered = [...allMatches];

    // Filtrar por status
    if (matchStatusFilter !== "all") {
      filtered = filtered.filter((match) => {
        const status = displayMatchStatus(match);
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
  }, [matchStatusFilter, matchPeriodFilter, allMatches, liveStatusByMatchId]);

  const getMatchStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Agendado",
      scheduled: "Agendado",
      live: "Ao Vivo",
      finished: "Finalizado",
      canceled: "Cancelado",
      cancelled: "Cancelado",
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
      cancelled: "bg-red-100 text-red-800",
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

  const showStandingsTab = competition.system !== CompetitionSystem.ELIMINATION;
  const hasStandings = showStandingsTab && standings.length > 0;
  const hasMatches = matches.length > 0;
  const hasTeams = teams.length > 0;
  const effectiveTab: CompetitionTab = (() => {
    let t: CompetitionTab =
      activeTab === "stats" && !showStatsTab ? "standings" : activeTab;
    if (!showStandingsTab && t === "standings") {
      t = "teams";
    }
    return t;
  })();

  const myTeamInCompetition = myTeams.find(
    (t) => String(t.competition_id) === String(competitionId)
  );
  const canShowPlayerCreateTeam =
    !!session &&
    competition.status === CompetitionStatus.PENDING &&
    userRole !== null &&
    !myTeamInCompetition &&
    !!competition.organization_slug;

  const canManageCompetition =
    !!session && (userRole === OrgRole.OWNER || userRole === OrgRole.ORGANIZER);
  const canMutateCompetition =
    canManageCompetition && competition.status !== CompetitionStatus.FINISHED;

  const showFinishedHighlightsCard =
    competition.status === CompetitionStatus.FINISHED &&
    competitionHighlights &&
    (!!competitionHighlights.champion_team ||
      (competitionHighlights.stat_leaders?.length ?? 0) > 0);

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
                
                {/* Botões de Controle - Apenas para owner/organizador (bloqueado se finalizada) */}
                {canMutateCompetition && (
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

        {showFinishedHighlightsCard && competitionHighlights && (
          <Card className="p-6 border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-background">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Resultado e destaques
              </h2>
              {competitionHighlights.champion_team && (
                <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/90 p-4 sm:flex-row sm:items-center sm:gap-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                    Campeão
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TeamLogo
                      name={competitionHighlights.champion_team.name}
                      abbreviation={competitionHighlights.champion_team.abbreviation || "?"}
                      logoUrl={competitionHighlights.champion_team.logo_url ?? null}
                      className="h-12 w-12 shrink-0"
                      textClassName="text-xs"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-foreground">
                        {competitionHighlights.champion_team.name}
                      </div>
                      {competitionHighlights.champion_team.abbreviation && (
                        <div className="text-sm text-muted-foreground">
                          {competitionHighlights.champion_team.abbreviation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {(competitionHighlights.stat_leaders?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-3">
                    Top jogadores por estatística
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {competitionHighlights.stat_leaders.map((block) => (
                      <div
                        key={block.stat_type_id}
                        className="rounded-lg border border-border/80 bg-background p-4 space-y-2"
                      >
                        <div className="text-sm font-semibold text-gray-900">{block.name}</div>
                        <ul className="space-y-2 text-sm">
                          {block.leaders.map((L, idx) => {
                            const kid = String(L.player_keycloak_id ?? "").trim();
                            const label =
                              (kid && highlightPlayerNameByKeycloakId[kid]) || "Jogador";
                            return (
                              <li
                                key={`${L.player_id}-${idx}`}
                                className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                              >
                                <span className="min-w-0">
                                  <span className="font-medium text-foreground">{label}</span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {L.team_name || L.team_abbreviation || "—"}
                                  </span>
                                </span>
                                <span className="shrink-0 tabular-nums font-semibold text-foreground">
                                  {L.stat_value}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

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
                  {showStandingsTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("standings")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        effectiveTab === "standings"
                          ? "bg-main text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <TableProperties className="w-4 h-4" />
                        Classificação
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("teams")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      effectiveTab === "teams"
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
                      effectiveTab === "matches"
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

            {/* Tabela de pontos — omitida quando o sistema é só eliminatório */}
            {showStandingsTab && (
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
                        <TableRow key={`${String(team.team_id)}-${index}`}>
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
            )}

            {/* Times */}
            <TabsContent value="teams" className="mt-6 space-y-10">
              {canMutateCompetition && competition.organization_slug && (
                <CompetitionPendingTeamsSection
                  organizationSlug={competition.organization_slug}
                  competitionId={competitionId}
                  competitionName={competition.name}
                  isAdmin={!!canMutateCompetition}
                  onChanged={reloadCompetitionTeams}
                />
              )}

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Equipes na competição
                  </h3>
                  <p className="text-sm text-gray-600">
                    Times já aprovados e registrados neste campeonato.
                  </p>
                </div>
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
                  <div className="py-12 text-center rounded-xl border ">
                    <div className="flex flex-col items-center gap-4">
                      <Shield className="w-14 h-14 text-gray-300" />
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          Nenhuma equipe inscrita ainda
                        </h4>
                        <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                          Após aprovação, as equipes aparecem aqui. Jogadores podem criar um time
                          nesta competição quando houver vagas.
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
              </section>
            </TabsContent>

            {/* Estatísticas */}
            <TabsContent value="stats" className="mt-6">
              <div className="space-y-6">
                {canMutateCompetition && showStatsTab && (
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
                            : canMutateCompetition
                              ? "Use o formulário acima para adicionar as primeiras métricas."
                              : canManageCompetition
                                ? "Competição finalizada: as métricas não podem ser alteradas."
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
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 max-w-5xl">
                  {matches.map((match) => (
                    <Card
                      key={match.id}
                      className="overflow-hidden border border-border/80 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getMatchStatusColor(
                                displayMatchStatus(match)
                              )}`}
                            >
                              {getMatchStatusLabel(displayMatchStatus(match))}
                            </span>
                            {match.round_name && (
                              <span className="text-xs text-muted-foreground truncate">
                                {match.round_name}
                              </span>
                            )}
                          </div>
                          {canMutateCompetition && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setEditingMatch(match)}
                              aria-label="Editar jogo"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                            {match.scheduled_datetime ? (
                              formatDate(match.scheduled_datetime, "dd/MM/yyyy 'às' HH:mm")
                            ) : (
                              <span className="italic">Data não definida</span>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span className="truncate">
                              {match.local ? (
                                match.local
                              ) : (
                                <span className="italic">Local não definido</span>
                              )}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                            <div className="min-w-0 text-right">
                              <div className="truncate text-sm font-semibold text-foreground">
                                {match.home_team_name || match.home_team?.name || "Time A"}
                              </div>
                              {(match.home_team_abbreviation || match.home_team?.abbreviation) && (
                                <div className="text-[11px] text-muted-foreground">
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
                                  ? teamLogoByCompetitionTeamId.get(String(match.home_team.id))
                                  : undefined) ??
                                match.home_team?.logo_url ??
                                match.home_team?.logo ??
                                null
                              }
                              className="h-9 w-9 shrink-0"
                              textClassName="text-[10px]"
                            />
                          </div>

                          <div className="flex shrink-0 items-center gap-2 px-1 font-bold tabular-nums">
                            <span className="text-xl text-foreground">{match.home_score ?? "—"}</span>
                            <span className="text-sm font-normal text-muted-foreground">×</span>
                            <span className="text-xl text-foreground">{match.away_score ?? "—"}</span>
                          </div>

                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <TeamLogo
                              name={match.away_team_name || match.away_team?.name || "Time B"}
                              abbreviation={
                                match.away_team_abbreviation ||
                                match.away_team?.abbreviation ||
                                "?"
                              }
                              logoUrl={
                                (match.away_team?.id != null
                                  ? teamLogoByCompetitionTeamId.get(String(match.away_team.id))
                                  : undefined) ??
                                match.away_team?.logo_url ??
                                match.away_team?.logo ??
                                null
                              }
                              className="h-9 w-9 shrink-0"
                              textClassName="text-[10px]"
                            />
                            <div className="min-w-0 text-left">
                              <div className="truncate text-sm font-semibold text-foreground">
                                {match.away_team_name || match.away_team?.name || "Time B"}
                              </div>
                              {(match.away_team_abbreviation || match.away_team?.abbreviation) && (
                                <div className="text-[11px] text-muted-foreground">
                                  {match.away_team_abbreviation || match.away_team?.abbreviation}
                                </div>
                              )}
                            </div>
                          </div>
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
          onSuccess={() => {
            loadCompetitionData();
          }}
        />
      )}
    </div>
  );
}
