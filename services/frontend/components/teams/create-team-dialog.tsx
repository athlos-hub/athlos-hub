"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Trophy, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUpload } from "@/components/organizations/logo-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getMyOrganizations } from "@/actions/organizations";
import { listCompetitions } from "@/actions/competitions";
import { createTeam, getMyTeams } from "@/actions/teams";
import type { OrganizationListItem } from "@/types/organization";
import type { Competition } from "@/types/competition";
import type { TeamListItem } from "@/types/team";

function sameCompetitionId(
  a: string | number | undefined,
  b: string | number | undefined
): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando definido, organização e competição ficam fixos (página da competição). */
  fixedContext?: {
    organizationSlug: string;
    competition: Competition;
  };
  onSuccess?: (teamId: string) => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  fixedContext,
  onSuccess,
}: CreateTeamDialogProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [myTeams, setMyTeams] = useState<TeamListItem[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [teamName, setTeamName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const selectedComp = competitions.find(
    (c) => String(c.id) === selectedCompetition
  );

  const locked = !!fixedContext;

  useEffect(() => {
    if (!open) return;

    setTeamName("");
    setAbbreviation("");
    setLogoFile(null);

    if (locked && fixedContext) {
      setSelectedOrg(fixedContext.organizationSlug);
      setSelectedCompetition(String(fixedContext.competition.id));
      setCompetitions([fixedContext.competition]);
    } else {
      setSelectedOrg("");
      setSelectedCompetition("");
      setCompetitions([]);
    }

    let cancelled = false;
    (async () => {
      if (!locked) setIsLoading(true);
      try {
        const teams = await getMyTeams();
        if (cancelled) return;
        setMyTeams(teams);

        if (locked) return;

        const orgs = await getMyOrganizations();
        if (cancelled) return;
        setOrganizations(orgs);
        if (orgs.length === 0) {
          toast.error(
            "Você precisa fazer parte de uma organização para criar times."
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao carregar dados";
        toast.error(message);
      } finally {
        if (!cancelled && !locked) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, locked, fixedContext?.organizationSlug, fixedContext?.competition.id]);

  useEffect(() => {
    if (!open || locked || !selectedOrg) {
      if (!selectedOrg && !locked) setCompetitions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingCompetitions(true);
      try {
        const comps = await listCompetitions(0, 100, selectedOrg, "pending");
        if (cancelled) return;
        const taken = new Set(myTeams.map((t) => String(t.competition_id)));
        const available = comps.filter((c) => !taken.has(String(c.id)));
        setCompetitions(available);
        setSelectedCompetition("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao carregar competições";
        toast.error(message);
      } finally {
        if (!cancelled) setLoadingCompetitions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, locked, selectedOrg, myTeams]);

  const effectiveComp = locked && fixedContext ? fixedContext.competition : selectedComp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orgSlug = locked ? fixedContext!.organizationSlug : selectedOrg;
    const compId = locked
      ? String(fixedContext!.competition.id)
      : selectedCompetition;

    if (!orgSlug || !compId || !teamName || !abbreviation) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (abbreviation.length > 3) {
      toast.error("A abreviação deve ter no máximo 3 caracteres");
      return;
    }

    if (!effectiveComp) {
      toast.error("Competição inválida");
      return;
    }

    if (
      myTeams.some((t) => sameCompetitionId(t.competition_id, compId))
    ) {
      toast.error(
        "Você já participa de um time nesta competição. Não é possível criar outro ou se inscrever em outro time no mesmo campeonato."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("organization_slug", orgSlug);
      fd.set("competition_id", compId);
      fd.set("competition_name", effectiveComp.name);
      fd.set("name", teamName.trim());
      fd.set("abbreviation", abbreviation.toUpperCase().slice(0, 3));
      fd.set(
        "min_members",
        String(effectiveComp.min_members_per_team || 1)
      );
      fd.set(
        "max_members",
        String(effectiveComp.max_members_per_team || 20)
      );
      if (logoFile) {
        fd.set("logo", logoFile);
      }

      const team = await createTeam(fd);

      toast.success(
        "Time criado com sucesso! Agora você pode convidar jogadores."
      );
      onOpenChange(false);
      if (onSuccess) {
        onSuccess(team.id);
      } else {
        router.push(`/clubes/${team.id}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar time";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showForm =
    locked ||
    (!isLoading && organizations.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo time</DialogTitle>
          <DialogDescription>
            Inscreva seu time em uma competição com inscrições abertas. Você
            será o capitão e não poderá criar outro time no mesmo campeonato.
          </DialogDescription>
        </DialogHeader>

        {isLoading && !locked ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-main" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!locked && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
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
              </div>
            )}

            {!locked && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
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
                              ? "Nenhuma competição disponível"
                              : "Selecione uma competição"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions.map((comp) => (
                      <SelectItem key={comp.id} value={String(comp.id)}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Competências em que você já está em um time não aparecem aqui.
                </p>
              </div>
            )}

            {locked && fixedContext && (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{fixedContext.competition.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {fixedContext.organizationSlug}
                </span>
              </div>
            )}

            {showForm && (locked || selectedOrg) && (
              <>
                <div className="space-y-2">
                  <LogoUpload
                    label="Escudo do time (opcional)"
                    value={logoFile}
                    onChange={setLogoFile}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sem imagem, usamos a sigla no padrão da plataforma.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Nome do Time *
                  </Label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ex: Leões do Norte"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Abreviação (Sigla) *</Label>
                  <Input
                    value={abbreviation}
                    onChange={(e) =>
                      setAbbreviation(e.target.value.toUpperCase())
                    }
                    placeholder="Ex: LDN"
                    maxLength={3}
                    className="uppercase"
                  />
                </div>

                {effectiveComp && (
                  <div className="bg-muted/50 border rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2 font-medium">
                      <Trophy className="w-4 h-4" />
                      Requisitos da competição
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Mín. jogadores:</span>{" "}
                        <span className="font-semibold">
                          {effectiveComp.min_members_per_team || 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Máx. jogadores:</span>{" "}
                        <span className="font-semibold">
                          {effectiveComp.max_members_per_team || 20}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-900">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Como funciona:</strong>
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                      <li>Você cria o time e vira capitão</li>
                      <li>Convide jogadores pelo link</li>
                      <li>Com o mínimo de jogadores, solicite aprovação ao organizador</li>
                    </ol>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-main hover:bg-main/90 text-white"
                disabled={
                  isSubmitting ||
                  !showForm ||
                  (!locked && (!selectedCompetition || competitions.length === 0)) ||
                  (locked && !fixedContext)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar time"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
