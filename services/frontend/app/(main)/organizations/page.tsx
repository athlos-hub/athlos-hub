"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Building2, Users, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationCard } from "@/components/organizations/organization-card";
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog";
import type { OrganizationResponse } from "@/types/organization";
import {
  getOrganizations,
  getMyOrganizations,
} from "@/actions/organizations";
import {
  OrganizationGetPublic,
  OrganizationListItem,
  OrganizationPrivacy,
} from "@/types/organization";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel } from "@/components/layout/filter-panel";

type TabType = "all" | "public" | "private" | "my-organizations";
const PAGE_SIZE = 12;
const TAB_QUERY_MAP: Record<TabType, string> = {
  all: "todas",
  public: "publicas",
  private: "privadas",
  "my-organizations": "minhas",
};
const QUERY_TAB_MAP: Record<string, TabType> = {
  todas: "all",
  publicas: "public",
  privadas: "private",
  minhas: "my-organizations",
};

function OrganizationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [listedOrgs, setListedOrgs] = useState<OrganizationGetPublic[]>([]);
  const [myOrgs, setMyOrgs] = useState<OrganizationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const rawTab = searchParams.get("tab") ?? TAB_QUERY_MAP.all;
    const parsedTab = QUERY_TAB_MAP[rawTab] ?? "all";
    if (parsedTab === "my-organizations" && !session) {
      setActiveTab("all");
      return;
    }
    setActiveTab(parsedTab);
  }, [searchParams, session]);

  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  useEffect(() => {
    loadOrganizations();
  }, [activeTab, page, sessionStatus]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "my-organizations" && session) {
        const orgs = await getMyOrganizations();
        setMyOrgs(orgs);
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        setListedOrgs(orgs.slice(start, end));
        setHasNextPage(end < orgs.length);
        return;
      }

      if (activeTab === "private" && !session) {
        setListedOrgs([]);
        setHasNextPage(false);
        return;
      }

      const offset = page * PAGE_SIZE;
      const take = PAGE_SIZE + 1;
      const privacy =
        activeTab === "public"
          ? OrganizationPrivacy.PUBLIC
          : activeTab === "private"
            ? OrganizationPrivacy.PRIVATE
            : undefined;
      const orgs = await getOrganizations(privacy, take, offset, !!session);
      setListedOrgs(orgs.slice(0, PAGE_SIZE));
      setHasNextPage(orgs.length > PAGE_SIZE);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar organizações";
      toast.error(message);
      setListedOrgs([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationCreated = (organization: OrganizationResponse) => {
    router.push(`/organizations/${organization.slug}`);
  };

  const setTab = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      setPage(0);
      router.replace(`/organizations?tab=${TAB_QUERY_MAP[tab]}`, { scroll: false });
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onCreated={handleOrganizationCreated}
      />

      <PageHeader
        title="Organizações"
        subtitle="Gerencie suas organizações ou descubra novas"
        actions={
          session ? (
            <Button
              type="button"
              className="bg-main hover:bg-main/90 text-white"
              onClick={() => setCreateOrgOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Organização
            </Button>
          ) : null
        }
      />

      <FilterPanel icon={<Building2 className="w-5 h-5 text-gray-600" />}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas as organizações
            </button>
            <button
              type="button"
              onClick={() => setTab("public")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "public"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Organizações públicas
            </button>
            <button
              type="button"
              onClick={() => setTab("private")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "private"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Organizações privadas
            </button>

            {session && (
              <button
                type="button"
                onClick={() => setTab("my-organizations")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "my-organizations"
                    ? "bg-main text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Minhas Organizações
              </button>
            )}
          </div>
      </FilterPanel>

      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "public" && (
              <div className="space-y-4">
                {listedOrgs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma organização pública encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listedOrgs.map((org) => (
                      <OrganizationCard key={org.id} organization={org} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "all" && (
              <div className="space-y-4">
                {listedOrgs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma organização encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listedOrgs.map((org) => (
                      <OrganizationCard key={org.id} organization={org} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "private" && (
              <div className="space-y-4">
                {!session ? (
                  <div className="text-center py-12">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700">Faça login para ver organizações privadas.</p>
                  </div>
                ) : listedOrgs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma organização privada encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listedOrgs.map((org) => (
                      <OrganizationCard key={org.id} organization={org} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "my-organizations" && (
              <div className="space-y-4">
                {myOrgs.length === 0 ? (
                  <div className="text-center py-12 rounded-xl">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">
                      Você ainda não faz parte de nenhuma organização
                    </p>
                    <Button
                      type="button"
                      className="bg-main hover:bg-main/90 text-white"
                      onClick={() => setCreateOrgOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Organização
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listedOrgs.map((org) => (
                      <OrganizationCard
                        key={org.id}
                        organization={org}
                        showRole={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!isLoading &&
        (listedOrgs.length > 0 || page > 0) &&
        !(activeTab === "private" && !session) && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0}
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
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 bg-gray-100 rounded animate-pulse" />
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <OrganizationsPageContent />
    </Suspense>
  );
}
