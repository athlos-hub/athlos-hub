"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Building2, Users } from "lucide-react";
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

type TabType = "public" | "my-organizations";

const TAB_QUERY_MY = "minhas";

function OrganizationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [publicOrgs, setPublicOrgs] = useState<OrganizationGetPublic[]>([]);
  const [myOrgs, setMyOrgs] = useState<OrganizationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === TAB_QUERY_MY && session) {
      setActiveTab("my-organizations");
    } else {
      setActiveTab("public");
    }
  }, [searchParams, session]);

  useEffect(() => {
    loadOrganizations();
  }, [activeTab]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "public") {
        const orgs = await getOrganizations(OrganizationPrivacy.PUBLIC);
        setPublicOrgs(orgs);
      } else if (activeTab === "my-organizations" && session) {
        const orgs = await getMyOrganizations();
        setMyOrgs(orgs);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar organizações";
      toast.error(message);
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
      if (tab === "my-organizations") {
        router.replace(`/organizations?tab=${TAB_QUERY_MY}`, { scroll: false });
      } else {
        router.replace("/organizations", { scroll: false });
      }
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizações</h1>
          <p className="text-gray-600">
            Gerencie suas organizações ou descubra novas
          </p>
        </div>

        {session && (
          <Button
            type="button"
            className="bg-main hover:bg-main/90 text-white"
            onClick={() => setCreateOrgOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Organização
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Building2 className="w-5 h-5 text-gray-600" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("public")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "public"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Organizações Públicas
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
        </div>
      </div>

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
                {publicOrgs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma organização pública encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {publicOrgs.map((org) => (
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
                    {myOrgs.map((org) => (
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
