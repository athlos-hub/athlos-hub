"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationCard } from "@/components/organizations/organization-card";
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

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [publicOrgs, setPublicOrgs] = useState<OrganizationGetPublic[]>([]);
  const [myOrgs, setMyOrgs] = useState<OrganizationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizações</h1>
          <p className="text-gray-600">
            Gerencie suas organizações ou descubra novas
          </p>
        </div>

        {session && (
          <Link href="/organizations/new">
            <Button className="bg-main hover:bg-main/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nova Organização
            </Button>
          </Link>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("public")}
            className={`pb-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "public"
                ? "border-main text-main"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Building2 className="w-5 h-5" />
            Organizações Públicas
          </button>

          {session && (
            <button
              onClick={() => setActiveTab("my-organizations")}
              className={`pb-4 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "my-organizations"
                  ? "border-main text-main"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-5 h-5" />
              Minhas Organizações
            </button>
          )}
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
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">
                      Você ainda não faz parte de nenhuma organização
                    </p>
                    <Link href="/organizations/new">
                      <Button className="bg-main hover:bg-main/90 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Organização
                      </Button>
                    </Link>
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
