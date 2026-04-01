"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Loader2,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamCard } from "@/components/teams/team-card";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { getMyTeams, getOrganizationTeams } from "@/actions/teams";
import {
  getOrganizations,
  getMyOrganizations,
} from "@/actions/organizations";
import {
  getMyFollowedOrganizations,
  type OrganizationFollow,
} from "@/actions/follow";
import { listCompetitions } from "@/actions/competitions";
import type { TeamListItem } from "@/types/team";
import { TeamRole } from "@/types/team";
import type { OrganizationListItem } from "@/types/organization";
import { OrganizationPrivacy } from "@/types/organization";
import type { Competition } from "@/types/competition";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel } from "@/components/layout/filter-panel";

const PAGE_SIZE = 12;
const MAX_PUBLIC_ORGS_FOR_TEAMS = 36;

type OrgScope = "all" | "mine" | "following";
type ClubVisibility = "mine" | "all";

function isActiveInCompetitionStatus(status: string): boolean {
  const u = String(status).toUpperCase();
  return u === "APPROVED" || u === "ACTIVE";
}

/** Compara IDs de competição (UUID) de forma tolerante a casing. */
function matchesCompetitionFilter(
  teamCompetitionId: string | number | undefined,
  selectedId: string
): boolean {
  if (teamCompetitionId === undefined || teamCompetitionId === "") return false;
  return String(teamCompetitionId).toLowerCase() === selectedId.toLowerCase();
}

async function fetchAllFollowedSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let p = 0;
  const size = 100;
  for (;;) {
    const res = await getMyFollowedOrganizations(p, size);
    const content = (res.content ?? []) as OrganizationFollow[];
    for (const row of content) {
      const slug = row.organizationSlug;
      if (slug && !slugs.includes(slug)) slugs.push(slug);
    }
    if (content.length < size) break;
    if (res.totalPages != null && p >= res.totalPages - 1) break;
    p += 1;
    if (p > 50) break;
  }
  return slugs;
}

function mergeCompetitionsById(lists: Competition[][]): Competition[] {
  const byId = new Map<string, Competition>();
  for (const list of lists) {
    for (const c of list) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
}

function withRole(t: TeamListItem, role: TeamRole): TeamListItem {
  const memberCount = (t as unknown as { member_count?: number }).member_count;
  return {
    ...t,
    role,
    player_count:
      typeof t.player_count === "number" ? t.player_count : memberCount ?? 0,
    competition_id:
      t.competition_id ??
      (t as unknown as { competition_id?: string | number }).competition_id ??
      "",
  };
}

function dedupeTeamsById(teams: TeamListItem[]): TeamListItem[] {
  const byId = new Map<string, TeamListItem>();
  for (const t of teams) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function ClubesPainelPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgScope, setOrgScope] = useState<OrgScope>("all");
  const [clubVisibility, setClubVisibility] = useState<ClubVisibility>("all");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const [myOrganizations, setMyOrganizations] = useState<OrganizationListItem[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<Competition[]>([]);
  const [cachedMine, setCachedMine] = useState<OrganizationListItem[] | null>(null);
  const followedSlugsCacheRef = useRef<string[] | null>(null);

  const mergedTeamsRef = useRef<TeamListItem[] | null>(null);
  const mergedKeyRef = useRef<string>("");

  const [displayTeams, setDisplayTeams] = useState<TeamListItem[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalFiltered, setTotalFiltered] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [orgScope, clubVisibility, competitionFilter]);

  useEffect(() => {
    followedSlugsCacheRef.current = null;
  }, [orgScope]);

  useEffect(() => {
    mergedTeamsRef.current = null;
    mergedKeyRef.current = "";
  }, [orgScope, clubVisibility, competitionFilter]);

  useEffect(() => {
    if (status !== "authenticated") return;
    getMyOrganizations().then(setMyOrganizations).catch(() => {});
  }, [status]);

  useEffect(() => {
    if (isLoading) return;
    if (searchParams.get("criarTime") !== "1") return;

    router.replace("/clubes/painel", { scroll: false });

    if (myOrganizations.length > 0) {
      setCreateOpen(true);
    }
  }, [isLoading, myOrganizations, searchParams, router]);

  const showCompetitionFilter = orgScope === "mine" || orgScope === "following";

  useEffect(() => {
    if (status !== "authenticated" || !showCompetitionFilter) {
      setCompetitionOptions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        let slugs: string[] = [];
        if (orgScope === "mine") {
          const mine = cachedMine ?? (await getMyOrganizations());
          if (!cachedMine) setCachedMine(mine);
          slugs = mine.map((o) => o.slug);
        } else {
          if (followedSlugsCacheRef.current === null) {
            followedSlugsCacheRef.current = await fetchAllFollowedSlugs();
          }
          slugs = followedSlugsCacheRef.current;
        }
        if (slugs.length === 0) {
          if (!cancelled) setCompetitionOptions([]);
          return;
        }
        const lists = await Promise.all(
          slugs.map((slug) => listCompetitions(0, 200, slug).catch(() => [] as Competition[]))
        );
        if (!cancelled) setCompetitionOptions(mergeCompetitionsById(lists));
      } catch {
        if (!cancelled) setCompetitionOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, showCompetitionFilter, orgScope, cachedMine]);

  const loadData = useCallback(async () => {
    if (status !== "authenticated") return;

    setIsLoading(true);
    const mergedKey = `${orgScope}:${clubVisibility}:${competitionFilter}`;

    try {
      const mineRows = await getMyTeams();
      const activeMine = mineRows.filter((t) => isActiveInCompetitionStatus(String(t.status)));
      const idToRole = new Map(activeMine.map((t) => [t.id, t.role]));

      if (mergedTeamsRef.current && mergedKeyRef.current === mergedKey) {
        const merged = mergedTeamsRef.current;
        setTotalFiltered(merged.length);
        const slice = merged.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        setDisplayTeams(slice);
        setHasNextPage((page + 1) * PAGE_SIZE < merged.length);
        return;
      }

      let merged: TeamListItem[] = [];

      if (orgScope === "all" && clubVisibility === "mine") {
        merged = activeMine;
      } else if (orgScope === "all" && clubVisibility === "all") {
        const orgs = await getOrganizations(OrganizationPrivacy.PUBLIC, MAX_PUBLIC_ORGS_FOR_TEAMS, 0);
        const lists = await Promise.all(
          orgs.map((o) =>
            getOrganizationTeams(o.slug).catch(() => [] as TeamListItem[])
          )
        );
        const flat: TeamListItem[] = [];
        for (const list of lists) {
          for (const t of list) {
            if (!isActiveInCompetitionStatus(String(t.status))) continue;
            const role = idToRole.get(t.id) ?? TeamRole.PLAYER;
            flat.push(withRole(t, role));
          }
        }
        merged = dedupeTeamsById(flat);
      } else if (orgScope === "mine") {
        const mine = cachedMine ?? (await getMyOrganizations());
        if (!cachedMine) setCachedMine(mine);
        const slugs = mine.map((o) => o.slug);
        const lists = await Promise.all(
          slugs.map((slug) =>
            getOrganizationTeams(slug).catch(() => [] as TeamListItem[])
          )
        );
        let flat: TeamListItem[] = [];
        for (const list of lists) {
          for (const t of list) {
            if (!isActiveInCompetitionStatus(String(t.status))) continue;
            const role = idToRole.get(t.id) ?? TeamRole.PLAYER;
            flat.push(withRole(t, role));
          }
        }
        flat = dedupeTeamsById(flat);
        if (competitionFilter !== "all") {
          flat = flat.filter((t) =>
            matchesCompetitionFilter(t.competition_id, competitionFilter)
          );
        }
        if (clubVisibility === "mine") {
          flat = flat.filter((t) => idToRole.has(t.id));
        }
        merged = flat;
      } else {
        if (followedSlugsCacheRef.current === null) {
          followedSlugsCacheRef.current = await fetchAllFollowedSlugs();
        }
        const slugs = followedSlugsCacheRef.current;
        const lists = await Promise.all(
          slugs.map((slug) =>
            getOrganizationTeams(slug).catch(() => [] as TeamListItem[])
          )
        );
        let flat: TeamListItem[] = [];
        for (const list of lists) {
          for (const t of list) {
            if (!isActiveInCompetitionStatus(String(t.status))) continue;
            const role = idToRole.get(t.id) ?? TeamRole.PLAYER;
            flat.push(withRole(t, role));
          }
        }
        flat = dedupeTeamsById(flat);
        if (competitionFilter !== "all") {
          flat = flat.filter((t) =>
            matchesCompetitionFilter(t.competition_id, competitionFilter)
          );
        }
        if (clubVisibility === "mine") {
          flat = flat.filter((t) => idToRole.has(t.id));
        }
        merged = flat;
      }

      mergedTeamsRef.current = merged;
      mergedKeyRef.current = mergedKey;
      setTotalFiltered(merged.length);
      const slice = merged.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      setDisplayTeams(slice);
      setHasNextPage((page + 1) * PAGE_SIZE < merged.length);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar dados";
      toast.error(message);
      setDisplayTeams([]);
      setHasNextPage(false);
      setTotalFiltered(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    status,
    orgScope,
    clubVisibility,
    competitionFilter,
    page,
    cachedMine,
  ]);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status, loadData]);

  const canCreateTeam = myOrganizations.length > 0;
  const filtersDirty =
    orgScope !== "all" || clubVisibility !== "all" || competitionFilter !== "all";

  const onOrgScopeChange = (v: OrgScope) => {
    if ((v === "mine" || v === "following") && status !== "authenticated") {
      toast.info("Entre na sua conta.");
      return;
    }
    setOrgScope(v);
    if (v === "all") {
      setCompetitionFilter("all");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-main" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Faça login para ver o painel de clubes.
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Painel de clubes"
        subtitle="Explore os clubes de competições públicas"
        actions={
          canCreateTeam ? (
            <Button
              type="button"
              className="bg-main hover:bg-main/90 text-white shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo time
            </Button>
          ) : null
        }
      />

      <FilterPanel icon={<Filter className="w-4 h-4 text-gray-500" />}>

          <div className="w-full sm:w-56">
            <Select value={orgScope} onValueChange={(v) => onOrgScopeChange(v as OrgScope)}>
              <SelectTrigger>
                <SelectValue placeholder="Organizações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Organizações públicas</SelectItem>
                <SelectItem value="mine">Minhas organizações</SelectItem>
                <SelectItem value="following">Organizações que sigo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCompetitionFilter && (
            <div className="w-full sm:w-64">
              <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Campeonato" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  <SelectItem value="all">Todos os campeonatos</SelectItem>
                  {competitionOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-52">
            <Select
              value={clubVisibility}
              onValueChange={(v) => setClubVisibility(v as ClubVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clubes</SelectItem>
                <SelectItem value="mine">Meus clubes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!filtersDirty}
            onClick={() => {
              setOrgScope("all");
              setClubVisibility("all");
              setCompetitionFilter("all");
              setPage(0);
            }}
          >
            Limpar filtros
          </Button>
      </FilterPanel>

      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Nenhuma equipe encontrada com os filtros atuais.</p>
            <p className="text-sm text-gray-500 mb-6">
              {clubVisibility === "mine"
                ? "Ajuste os filtros ou participe de um time."
                : "Tente outro filtro de organização ou campeonato."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {canCreateTeam && (
                <Button
                  type="button"
                  className="bg-main hover:bg-main/90 text-white"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar time
                </Button>
              )}
              <Link href="/organizations?tab=minhas">
                <Button variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Minhas organizações
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  hideStatus
                  showRole={false}
                />
              ))}
            </div>

            {(displayTeams.length > 0 || page > 0) && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 pt-2 mt-6">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 0 || isLoading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums px-2">
                    Página {page + 1}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(teamId) => {
          mergedTeamsRef.current = null;
          mergedKeyRef.current = "";
          loadData();
          router.push(`/clubes/${teamId}`);
        }}
      />
    </div>
  );
}
