"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, X, Building2, Users, Trophy } from "lucide-react";
import Link from "next/link";
import { PostCard } from "@/components/social/post-card";
import { searchPosts, searchOrganizations, searchUsers, searchTeams, type Organization, type User, type Team } from "@/actions/search";
import { getOrganizationPosts, getTeamPosts } from "@/actions/social-posts";
import { getAthletePostsByKeycloakId } from "@/actions/athlete-posts";
import { Post } from "@/types/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrganizationGetPublic, OrganizationResponse } from "@/types/organization";
import type { TeamDetail } from "@/types/team";

type SearchTab = "posts" | "organizations" | "users" | "teams";

function teamDetailToSearchRow(d: TeamDetail): Team {
  return {
    id: d.id,
    organization_slug: d.organization_slug,
    organization_name: d.organization_name ?? "",
    competition_id: String(d.competition_id),
    competition_name: d.competition_name,
    name: d.name,
    abbreviation: d.abbreviation,
    logo_url: d.logo_url ?? null,
    status: String(d.status),
    player_count: d.member_count,
    member_count: d.member_count,
    created_at: d.created_at,
  };
}

function orgResponseToSearchCard(
  o: OrganizationGetPublic | OrganizationResponse
): Organization {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    description: o.description ?? "",
    logo_url: o.logo_url,
    privacy: o.privacy,
    created_at: o.created_at,
  };
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationSlug = searchParams.get("organization")?.trim() || "";
  const teamWallId = searchParams.get("team")?.trim() || "";
  const athleteWallId = searchParams.get("athlete")?.trim() || "";
  const qParam = searchParams.get("q")?.trim() || "";
  const inOrgWall = Boolean(organizationSlug);
  const inTeamWall = Boolean(teamWallId);
  const inAthleteWall = Boolean(athleteWallId);
  const inWallMode = inOrgWall || inTeamWall || inAthleteWall;
  const hasTextSearch = Boolean(qParam);

  const [query, setQuery] = useState(qParam);
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [activeTab, setActiveTab] = useState<SearchTab>("posts");
  
  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(true);
  
  // Organizations
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const loadAllResultsForQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;

    setPostsLoading(true);
    setOrgsLoading(true);
    try {
      const [postsResult, orgsResult] = await Promise.allSettled([
        searchPosts(q, 0, 20),
        searchOrganizations(q),
      ]);

      const postsData =
        postsResult.status === "fulfilled"
          ? postsResult.value
          : { content: [] as Post[], totalPages: 0, totalElements: 0 };
      const orgsData =
        orgsResult.status === "fulfilled" ? orgsResult.value : [];

      const qNorm = q.trim().toLowerCase();
      const orgsForWall = orgsData.filter(
        (o) =>
          o.slug.toLowerCase() === qNorm ||
          o.name.trim().toLowerCase() === qNorm
      );

      const merged: Post[] = [...postsData.content];
      const seen = new Set(merged.map((p) => p.id));
      let orgWallHasMore = false;

      if (orgsForWall.length > 0) {
        const orgPageResults = await Promise.allSettled(
          orgsForWall.map((o) => getOrganizationPosts(o.slug, 0, 20))
        );
        for (const r of orgPageResults) {
          if (r.status !== "fulfilled" || !r.value) continue;
          if (r.value.totalPages > 1) orgWallHasMore = true;
          for (const p of r.value.content) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          }
        }
        merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      setPosts(merged);
      setPostsHasMore(postsData.totalPages > 1 || orgWallHasMore);
      setPostsPage(0);
      setOrganizations(orgsData);
    } catch {
      setPosts([]);
      setOrganizations([]);
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
      setOrgsLoading(false);
    }

    setUsersLoading(true);
    try {
      const usersData = await searchUsers(q);
      setUsers(usersData);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }

    setTeamsLoading(true);
    try {
      const teamsData = await searchTeams(q);
      setTeams(teamsData);
    } catch {
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const loadOrgWallPage = useCallback(async (slug: string, page: number, append: boolean) => {
    setPostsLoading(true);
    try {
      const data = await getOrganizationPosts(slug, page, 20);
      if (!data) {
        if (!append) setPosts([]);
        setPostsHasMore(false);
        setPostsPage(0);
        return;
      }
      if (append) {
        setPosts((prev) => [...prev, ...data.content]);
      } else {
        setPosts(data.content);
      }
      setPostsPage(page);
      setPostsHasMore(page + 1 < data.totalPages);
    } catch {
      if (!append) setPosts([]);
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadTeamWallPage = useCallback(async (teamId: string, page: number, append: boolean) => {
    setPostsLoading(true);
    try {
      const data = await getTeamPosts(teamId, page, 20);
      if (!data) {
        if (!append) setPosts([]);
        setPostsHasMore(false);
        setPostsPage(0);
        return;
      }
      if (append) {
        setPosts((prev) => [...prev, ...data.content]);
      } else {
        setPosts(data.content);
      }
      setPostsPage(page);
      setPostsHasMore(page + 1 < data.totalPages);
    } catch {
      if (!append) setPosts([]);
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadAthleteWallPage = useCallback(async (keycloakId: string, page: number, append: boolean) => {
    setPostsLoading(true);
    try {
      const data = await getAthletePostsByKeycloakId(keycloakId, page, 20);
      if (!data) {
        if (!append) setPosts([]);
        setPostsHasMore(false);
        setPostsPage(0);
        return;
      }
      if (append) {
        setPosts((prev) => [...prev, ...data.content]);
      } else {
        setPosts(data.content);
      }
      setPostsPage(page);
      setPostsHasMore(page + 1 < data.totalPages);
    } catch {
      if (!append) setPosts([]);
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  /** Preenche a aba Orgs no mural da organização; times ficam vazios neste modo. */
  const loadOrgWallSideContext = useCallback(async (slug: string) => {
    setOrgsLoading(true);
    setTeams([]);
    try {
      const { getOrganizationBySlug } = await import("@/actions/organizations");
      let raw: OrganizationGetPublic | OrganizationResponse;
      try {
        raw = (await getOrganizationBySlug(slug, true)) as OrganizationResponse;
      } catch {
        raw = (await getOrganizationBySlug(slug, false)) as OrganizationGetPublic;
      }
      setOrganizations([orgResponseToSearchCard(raw)]);
    } catch {
      setOrganizations([]);
    } finally {
      setTeams([]);
      setOrgsLoading(false);
    }
  }, []);

  /** Mural do time: só o próprio time na aba Times; sem organização na aba Orgs. */
  const loadTeamWallSideContext = useCallback(async (teamId: string) => {
    setTeamsLoading(true);
    setOrganizations([]);
    try {
      const { getTeamById } = await import("@/actions/teams");
      const detail = await getTeamById(teamId);
      setTeams([teamDetailToSearchRow(detail)]);
    } catch {
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    const org = searchParams.get("organization")?.trim() || "";
    const team = searchParams.get("team")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";

    setQuery(q);

    if (org) {
      setActiveTab("posts");
      setSearchQuery("");
      setOrganizations([]);
      setUsers([]);
      setTeams([]);
      void loadOrgWallPage(org, 0, false);
      void loadOrgWallSideContext(org);
      return;
    }

    if (team) {
      setActiveTab("posts");
      setSearchQuery("");
      setOrganizations([]);
      setUsers([]);
      setTeams([]);
      void loadTeamWallPage(team, 0, false);
      void loadTeamWallSideContext(team);
      return;
    }

    if (athleteWallId) {
      setActiveTab("posts");
      setSearchQuery("");
      setOrganizations([]);
      setUsers([]);
      setTeams([]);
      void loadAthleteWallPage(athleteWallId, 0, false);
      return;
    }

    if (q) {
      setSearchQuery(q);
      void loadAllResultsForQuery(q);
      return;
    }

    setSearchQuery("");
    setPosts([]);
    setPostsHasMore(false);
    setPostsPage(0);
    setOrganizations([]);
    setUsers([]);
    setTeams([]);
  }, [
    searchParams.toString(),
    loadOrgWallPage,
    loadTeamWallPage,
    loadAthleteWallPage,
    loadAllResultsForQuery,
    loadOrgWallSideContext,
    loadTeamWallSideContext,
  ]);

  const loadMorePosts = async () => {
    const nextPage = postsPage + 1;
    const org = searchParams.get("organization")?.trim() || "";
    const team = searchParams.get("team")?.trim() || "";
    const athlete = searchParams.get("athlete")?.trim() || "";

    try {
      if (org) {
        await loadOrgWallPage(org, nextPage, true);
        return;
      }
      if (team) {
        await loadTeamWallPage(team, nextPage, true);
        return;
      }
      if (athlete) {
        await loadAthleteWallPage(athlete, nextPage, true);
        return;
      }
      const postsData = await searchPosts(searchQuery, nextPage, 20);
      setPosts((prev) => [...prev, ...postsData.content]);
      setPostsHasMore(nextPage + 1 < postsData.totalPages);
      setPostsPage(nextPage);
    } catch (error) {
      console.error("Error loading more posts:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const t = query.trim();
      setSearchQuery(t);
      router.push(`/social/search?q=${encodeURIComponent(t)}`);
    }
  };

  // Sem termo e sem filtro de mural (org/time)
  if (!inWallMode && !hasTextSearch) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Buscar"
          subtitle="Procure por postagens, usuários, organizações e times"
        />

        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-gray-200 bg-card p-6 shadow-sm"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar na comunidade…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>

        <div className="py-12 text-center text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
          <p className="font-medium text-foreground">Digite um termo para buscar</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">
            Encontre publicações, usuários, organizações e times.
          </p>
        </div>
      </div>
    );
  }

  const wallSubtitle =
    inOrgWall
      ? `Organização · ${organizationSlug}`
      : inTeamWall
        ? "Time"
        : inAthleteWall
          ? "Atleta"
          : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={inWallMode ? "Mural" : "Buscar"}
        subtitle={
          inWallMode
            ? wallSubtitle
            : "Procure por postagens, usuários, organizações e times"
        }
      />
      {inOrgWall && (
        <p className="text-sm text-muted-foreground -mt-2">
          <Link
            href={`/organizations/${organizationSlug}`}
            className="font-medium text-main hover:underline"
          >
            Abrir perfil da organização
          </Link>
        </p>
      )}
      {inTeamWall && (
        <p className="text-sm text-muted-foreground -mt-2">
          <Link href={`/clubes/${teamWallId}`} className="font-medium text-main hover:underline">
            Abrir página do time
          </Link>
        </p>
      )}
      {inAthleteWall && (
        <p className="text-sm text-muted-foreground -mt-2">
          <Link
            href={`/profile/${encodeURIComponent(athleteWallId)}`}
            className="font-medium text-main hover:underline"
          >
            Abrir perfil do atleta
          </Link>
        </p>
      )}

      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-gray-200 bg-card p-6 shadow-sm"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar na comunidade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SearchTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts" className="relative">
            Posts
            {posts.length > 0 && (
              <span className="ml-2 text-xs bg-main text-white rounded-full px-2 py-0.5">
                {posts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations" className="relative">
            Orgs
            {organizations.length > 0 && (
              <span className="ml-2 text-xs bg-main text-white rounded-full px-2 py-0.5">
                {organizations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="relative">
            Usuários
            {users.length > 0 && (
              <span className="ml-2 text-xs bg-main text-white rounded-full px-2 py-0.5">
                {users.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="teams" className="relative">
            Times
            {teams.length > 0 && (
              <span className="ml-2 text-xs bg-main text-white rounded-full px-2 py-0.5">
                {teams.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-6">
          {postsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-main" />
              <p className="text-sm text-muted-foreground mt-3">
                {inWallMode ? "Carregando publicações…" : "Procurando posts…"}
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
              <p className="font-medium text-foreground">Nenhum post encontrado</p>
              <p className="text-sm mt-2 max-w-sm mx-auto">
                {inWallMode
                  ? "Não há publicações visíveis neste mural ou ainda não há posts."
                  : "Tente outros termos para encontrar posts."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {postsHasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMorePosts}
                    variant="outline"
                  >
                    Carregar mais posts
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6">
          {orgsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-main" />
              <p className="text-sm text-muted-foreground mt-3">Procurando organizações…</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
              <p className="font-medium text-foreground">Nenhuma organização encontrada</p>
              <p className="text-sm mt-2 max-w-sm mx-auto">Tente outros termos para encontrar organizações.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.slug}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage
                      src={org.logo_url || ""}
                      alt={org.name}
                      className="object-contain p-1.5"
                    />
                    <AvatarFallback className="rounded-lg">
                      <Building2 className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{org.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {org.description || "Sem descrição"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {org.privacy === "PUBLIC" ? "Pública" : "Privada"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          {usersLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-main" />
              <p className="text-sm text-muted-foreground mt-3">Procurando usuários…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
              <p className="font-medium text-foreground">Nenhum usuário encontrado</p>
              <p className="text-sm mt-2 max-w-sm mx-auto">Tente outros termos para encontrar usuários.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.keycloak_id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || ""} alt={user.username} />
                    <AvatarFallback>
                      {`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.username}
                    </h3>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-6">
          {teamsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-main" />
              <p className="text-sm text-muted-foreground mt-3">Procurando times…</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
              <p className="font-medium text-foreground">Nenhum time encontrado</p>
              <p className="text-sm mt-2 max-w-sm mx-auto">
                {inOrgWall
                  ? "Neste mural da organização não listamos equipes. Use o perfil da organização para ver os times."
                  : "Tente outros termos para encontrar times."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/clubes/${team.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage
                      src={team.logo_url || ""}
                      alt={team.name}
                      className="object-contain p-1.5"
                    />
                    <AvatarFallback className="rounded-lg bg-main/10 text-main font-bold">
                      {team.abbreviation || team.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">{team.organization_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {team.competition_name}
                      {team.player_count > 0 && ` • ${team.player_count} jogadores`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
