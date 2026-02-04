"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Loader2, Shield, Trophy, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/teams/team-card";
import { getMyTeams } from "@/actions/teams";
import { getMyOrganizations } from "@/actions/organizations";
import type { TeamListItem } from "@/types/team";
import type { OrganizationListItem } from "@/types/organization";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ClubesPainelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [myOrganizations, setMyOrganizations] = useState<OrganizationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    
    if (status === "authenticated") {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsData, orgsData] = await Promise.all([
        getMyTeams(),
        getMyOrganizations(),
      ]);
      setTeams(teamsData);
      setMyOrganizations(orgsData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar dados";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica se o usuário pode criar times (é OWNER ou ORGANIZER de alguma organização)
  const canCreateTeam = myOrganizations.length > 0;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-main" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Clubes</h1>
          <p className="text-gray-600">
            Gerencie os times dos quais você faz parte
          </p>
        </div>

        {canCreateTeam && (
          <Link href="/clubes/novo">
            <Button className="bg-main hover:bg-main/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Time
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <div>
            <h2 className="font-medium text-gray-900">Painel do Clube</h2>
            <p className="text-sm text-gray-500">
              Visualize seus times, gerencie convites e acompanhe suas competições
            </p>
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
        ) : teams.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              Você ainda não faz parte de nenhum time
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {canCreateTeam 
                ? "Crie um novo time ou entre em um time através de um link de convite."
                : "Entre em um time através de um link de convite ou aguarde ser adicionado por um organizador."
              }
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {canCreateTeam && (
                <Link href="/clubes/novo">
                  <Button className="bg-main hover:bg-main/90 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Time
                  </Button>
                </Link>
              )}
              <Link href="/organizations">
                <Button variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Explorar Organizações
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} showRole={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
