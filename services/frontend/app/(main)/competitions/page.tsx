"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Trophy,
  Filter,
  Building2,
  Calendar,
  Users,
  Target,
  Zap,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
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
import { getOrganizationBySlug, getMyOrganizations } from "@/actions/organizations";
import { getMyFollowedOrganizations } from "@/actions/follow";
import type { Competition, CompetitionStatus, CompetitionPhase } from "@/types/competition";
import type { OrganizationGetPublic, OrganizationListItem } from "@/types/organization";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COMPETITIONS_PAGE_SIZE = 12;
const PER_ORG_FETCH_LIMIT = 500;

type OrgScope = "all" | "mine" | "following";

async function fetchAllFollowedSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let p = 0;
  const size = 100;
  for (;;) {
    const res = await getMyFollowedOrganizations(p, size);
    const content = res.content ?? [];
    for (const row of content) {
      const slug =
        (row as { organizationSlug?: string; organization_slug?: string }).organizationSlug ??
        (row as { organization_slug?: string }).organization_slug;
      if (slug && !slugs.includes(slug)) slugs.push(slug);
    }
    if (content.length < size) break;
    if (res.totalPages != null && p >= res.totalPages - 1) break;
    p += 1;
    if (p > 50) break;
  }
  return slugs;
}

function mergeCompetitionsFromOrgs(lists: Competition[][]): Competition[] {
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

export default function CompetitionsPage() {
  const { status: sessionStatus } = useSession();

  const [orgScope, setOrgScope] = useState<OrgScope>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  const [cachedMine, setCachedMine] = useState<OrganizationListItem[] | null>(null);
  const followedSlugsCacheRef = useRef<string[] | null>(null);
  const mergedListRef = useRef<Competition[] | null>(null);
  const mergedKeyRef = useRef<string>("");

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [mergedTotalCount, setMergedTotalCount] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orgBySlug, setOrgBySlug] = useState<Record<string, OrganizationGetPublic>>({});

  const mergedMode = orgScope === "mine" || orgScope === "following";

  useEffect(() => {
    setPage(0);
  }, [orgScope, selectedStatus]);

  useEffect(() => {
    followedSlugsCacheRef.current = null;
  }, [orgScope]);

  useEffect(() => {
    mergedListRef.current = null;
    mergedKeyRef.current = "";
  }, [orgScope, selectedStatus]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const statusFilter = selectedStatus !== "all" ? selectedStatus : undefined;

    try {
      if (orgScope === "all") {
        mergedListRef.current = null;
        const skip = page * COMPETITIONS_PAGE_SIZE;
        // Busca PAGE_SIZE + 1: se vier mais que PAGE_SIZE, existe próxima página.
        // Só comparar length === PAGE_SIZE erra quando o total é múltiplo exato de PAGE_SIZE.
        const take = COMPETITIONS_PAGE_SIZE + 1;
        const raw = await listCompetitions(skip, take, undefined, statusFilter);
        setCompetitions(raw.slice(0, COMPETITIONS_PAGE_SIZE));
        setMergedTotalCount(null);
        setHasNextPage(raw.length > COMPETITIONS_PAGE_SIZE);
        return;
      }

      if (sessionStatus !== "authenticated") {
        setCompetitions([]);
        setMergedTotalCount(null);
        setHasNextPage(false);
        return;
      }

      const mergedKey = `${orgScope}::${selectedStatus}`;

      if (mergedListRef.current && mergedKeyRef.current === mergedKey) {
        const merged = mergedListRef.current;
        setMergedTotalCount(merged.length);
        const slice = merged.slice(
          page * COMPETITIONS_PAGE_SIZE,
          page * COMPETITIONS_PAGE_SIZE + COMPETITIONS_PAGE_SIZE
        );
        setCompetitions(slice);
        setHasNextPage((page + 1) * COMPETITIONS_PAGE_SIZE < merged.length);
        return;
      }

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
        mergedListRef.current = null;
        mergedKeyRef.current = mergedKey;
        setCompetitions([]);
        setMergedTotalCount(0);
        setHasNextPage(false);
        return;
      }

      const lists = await Promise.all(
        slugs.map((slug) => listCompetitions(0, PER_ORG_FETCH_LIMIT, slug, statusFilter))
      );
      const merged = mergeCompetitionsFromOrgs(lists);
      mergedListRef.current = merged;
      mergedKeyRef.current = mergedKey;
      setMergedTotalCount(merged.length);

      const slice = merged.slice(
        page * COMPETITIONS_PAGE_SIZE,
        page * COMPETITIONS_PAGE_SIZE + COMPETITIONS_PAGE_SIZE
      );
      setCompetitions(slice);
      setHasNextPage((page + 1) * COMPETITIONS_PAGE_SIZE < merged.length);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar competições");
      setCompetitions([]);
      setMergedTotalCount(null);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [orgScope, page, selectedStatus, sessionStatus, cachedMine]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const slugs = [
      ...new Set(
        competitions.map((c) => c.organization_slug).filter(Boolean) as string[]
      ),
    ];
    if (slugs.length === 0) {
      setOrgBySlug({});
      return;
    }
    let cancelled = false;
    Promise.all(
      slugs.map(async (slug) => {
        try {
          const o = await getOrganizationBySlug(slug, false);
          return [slug, o as OrganizationGetPublic] as const;
        } catch {
          return [slug, null] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, OrganizationGetPublic> = {};
      for (const [slug, org] of entries) {
        if (org?.name) map[slug] = org;
      }
      setOrgBySlug(map);
    });
    return () => {
      cancelled = true;
    };
  }, [competitions]);

  const getStatusLabel = (status: CompetitionStatus): string => {
    const labels = {
      pending: "Não iniciado",
      started: "Em andamento",
      finished: "Finalizada",
    };
    return labels[status] || String(status);
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
        return <Target className="w-4 h-4 shrink-0" />;
      case "elimination":
        return <Zap className="w-4 h-4 shrink-0" />;
      case "mixed":
        return <Layers className="w-4 h-4 shrink-0" />;
      default:
        return <Trophy className="w-4 h-4 shrink-0" />;
    }
  };

  const getSystemLabel = (system: string): string => {
    const labels: Record<string, string> = {
      points: "Pontos corridos",
      elimination: "Eliminatório",
      mixed: "Grupos + mata-mata",
    };
    return labels[system] || system;
  };

  const getPhaseLabel = (phase?: CompetitionPhase): string => {
    if (!phase) return "";
    const labels = { groups: "Fase de grupos", elimination: "Fase eliminatória" };
    return labels[phase] || "";
  };

  const onScopeChange = (v: OrgScope) => {
    if ((v === "mine" || v === "following") && sessionStatus !== "authenticated") {
      toast.info("Entre na sua conta para usar este filtro.");
      return;
    }
    setOrgScope(v);
  };

  const filtersDirty = orgScope !== "all" || selectedStatus !== "all";

  return (
    <div className="container min-w-0">
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Competições</h1>
          <p className="text-muted-foreground mt-1">
            Explore competições públicas e veja a organização responsável por cada uma.
          </p>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4 text-gray-500" />
              Filtros
            </div>

            <div className="w-full sm:w-64">
              <Select value={orgScope} onValueChange={(v) => onScopeChange(v as OrgScope)}>
                <SelectTrigger>
                  <SelectValue placeholder="Organizações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as organizações</SelectItem>
                  <SelectItem value="mine" disabled={sessionStatus !== "authenticated"}>
                    Minhas organizações
                  </SelectItem>
                  <SelectItem value="following" disabled={sessionStatus !== "authenticated"}>
                    Organizações que sigo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={selectedStatus}
                onValueChange={(v) => {
                  setSelectedStatus(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Não iniciado</SelectItem>
                  <SelectItem value="started">Em andamento</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
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
                setSelectedStatus("all");
                setPage(0);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </Card>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-main" />
          </div>
        )}

        {!isLoading && competitions.length === 0 && (
          <Card className="p-12 text-center border-none shadow-none">
            <Trophy className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma competição com os filtros atuais.</p>
          </Card>
        )}

        {!isLoading && competitions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {competitions.map((c) => {
              const slug = c.organization_slug ?? "";
              const org = slug ? orgBySlug[slug] : undefined;
              const orgName = org?.name ?? slug ?? "Organização";

              return (
                <Card
                  key={c.id}
                  className="overflow-hidden border-gray-200 hover:border-main/35 hover:shadow-md transition-all flex flex-col"
                >
                  <Link
                    href={`/competitions/${c.id}`}
                    className="block p-5 flex-1 space-y-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-gray-900 line-clamp-2 leading-snug">{c.name}</h2>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}
                      >
                        {getStatusLabel(c.status)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 shrink-0 opacity-80" />
                        <span>
                          {format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR })}
                          {" – "}
                          {format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0 opacity-80" />
                        <span>
                          {c.min_members_per_team}–{c.max_members_per_team} jogadores por time
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{getSystemIcon(c.system)}</span>
                        <span>{getSystemLabel(c.system)}</span>
                      </div>
                      {c.system === "mixed" && c.current_phase && (
                        <p className="text-xs">{getPhaseLabel(c.current_phase)}</p>
                      )}
                    </div>
                  </Link>

                  <div
                    className="border-t bg-muted/40 px-5 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={slug ? `/organizations/${slug}` : "#"}
                      onClick={(e) => {
                        if (!slug) e.preventDefault();
                      }}
                      className="flex items-center gap-3 min-w-0 group/org"
                    >
                      {org?.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt=""
                          className="w-9 h-9 rounded-md object-cover border shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-main/10 flex items-center justify-center shrink-0 border border-main/15">
                          <Building2 className="w-4 h-4 text-main" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Organização</p>
                        <p className="text-sm font-medium text-gray-900 truncate group-hover/org:text-main transition-colors">
                          {orgName}
                        </p>
                      </div>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && (competitions.length > 0 || page > 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 pt-2">
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
      </div>
    </div>
  );
}
