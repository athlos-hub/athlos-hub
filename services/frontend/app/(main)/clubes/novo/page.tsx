"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users, Trophy, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { getMyOrganizations } from "@/actions/organizations";
import { listCompetitions } from "@/actions/competitions";
import { createTeam } from "@/actions/teams";
import type { OrganizationListItem } from "@/types/organization";
import type { Competition } from "@/types/competition";

export default function NovoTimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  // Form state
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [teamName, setTeamName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");

  // Buscar competição selecionada
  const selectedComp = competitions.find(c => c.id.toString() === selectedCompetition);

  useEffect(() => {
    if (status === "authenticated") {
      loadOrganizations();
    }
  }, [status]);

  useEffect(() => {
    if (selectedOrg) {
      loadCompetitions(selectedOrg);
    } else {
      setCompetitions([]);
      setSelectedCompetition("");
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const orgs = await getMyOrganizations();
      setOrganizations(orgs);

      if (orgs.length === 0) {
        toast.error("Você precisa fazer parte de uma organização para criar times.");
        router.push("/clubes/painel");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar organizações";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompetitions = async (orgSlug: string) => {
    setLoadingCompetitions(true);
    try {
      // Buscar competições PENDENTES (abertas para inscrição)
      const comps = await listCompetitions(0, 100, orgSlug, "pending");
      setCompetitions(comps);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar competições";
      toast.error(message);
    } finally {
      setLoadingCompetitions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrg || !selectedCompetition || !teamName || !abbreviation) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (abbreviation.length > 3) {
      toast.error("A abreviação deve ter no máximo 3 caracteres");
      return;
    }

    if (!selectedComp) {
      toast.error("Competição inválida");
      return;
    }

    setIsSubmitting(true);
    try {
      const team = await createTeam({
        organization_slug: selectedOrg,
        competition_id: parseInt(selectedCompetition),
        competition_name: selectedComp.name,
        name: teamName,
        abbreviation: abbreviation.toUpperCase(),
        min_members: selectedComp.min_members_per_team || 1,
        max_members: selectedComp.max_members_per_team || 20,
        captain_keycloak_id: session?.user?.keycloakId || "",
        players: [
          { keycloak_id: session?.user?.keycloakId || "" } 
        ],
      });

      toast.success("Time criado com sucesso! Agora você pode convidar jogadores.");
      router.push(`/clubes/${team.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar time";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-main" />
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Criar Novo Time</h1>
            <p className="text-muted-foreground mt-1">
            Inscreva seu time em uma competição aberta.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organização */}
            <div className="space-y-2">
              <Label htmlFor="organization" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organização *
              </Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.slug}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Selecione a organização onde o time será criado
              </p>
            </div>

            {/* Competição */}
            <div className="space-y-2">
              <Label htmlFor="competition" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Competição *
              </Label>
              <Select
                value={selectedCompetition}
                onValueChange={setSelectedCompetition}
                disabled={!selectedOrg || loadingCompetitions}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedOrg
                        ? "Selecione uma organização primeiro"
                        : loadingCompetitions
                        ? "Carregando competições..."
                        : competitions.length === 0
                        ? "Nenhuma competição aberta"
                        : "Selecione uma competição"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id.toString()}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Apenas competições com inscrições abertas são exibidas
              </p>
            </div>

            {/* Nome do Time */}
            <div className="space-y-2">
              <Label htmlFor="teamName" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Nome do Time *
              </Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Leões do Norte"
                maxLength={100}
              />
              <p className="text-sm text-gray-500">
                Nome completo do time (máx. 100 caracteres)
              </p>
            </div>

            {/* Abreviação */}
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abreviação (Sigla) *</Label>
              <Input
                id="abbreviation"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                placeholder="Ex: LDN"
                maxLength={3}
                className="uppercase"
              />
              <p className="text-sm text-gray-500">
                Sigla do time com até 3 caracteres
              </p>
            </div>

            {/* Info da Competição (exibe min/max jogadores) */}
            {selectedComp && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Requisitos da Competição</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Mínimo de jogadores:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedComp.min_members_per_team || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Máximo de jogadores:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedComp.max_members_per_team || 20}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info do Fluxo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Como funciona:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Você cria o time e se torna automaticamente o capitão</li>
                  <li>Gere links de convite para adicionar jogadores ao time</li>
                  <li>Quando atingir o mínimo de jogadores, solicite aprovação</li>
                  <li>Após aprovado, o time estará inscrito na competição!</li>
                </ol>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Link href="/clubes/painel">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-main hover:bg-main/90 text-white"
                disabled={isSubmitting || !selectedCompetition}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Time"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
