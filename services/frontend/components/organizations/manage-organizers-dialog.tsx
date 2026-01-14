"use client";

import { useState, useEffect } from "react";
import { UserCog, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getOrganizationMembers, getOrganizationOrganizers, addOrganizer, removeOrganizer } from "@/actions/organizations";
import type { OrganizationResponse, OrganizationMemberResponse, OrganizerResponse } from "@/types/organization";

interface ManageOrganizersDialogProps {
  organization: OrganizationResponse;
}

export function ManageOrganizersDialog({ organization }: ManageOrganizersDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<OrganizationMemberResponse[]>([]);
  const [organizers, setOrganizers] = useState<Set<string>>(new Set());
  const [selectedOrganizers, setSelectedOrganizers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, organizersData] = await Promise.all([
        getOrganizationMembers(organization.slug),
        getOrganizationOrganizers(organization.slug),
      ]);

      const filteredMembers = membersData.members.filter(
        (m: OrganizationMemberResponse) => m.user.id !== organization.owner_id
      );
      setMembers(filteredMembers);

      const organizerIds = new Set<string>(
        organizersData.organizers.map((o: OrganizerResponse) => o.user.id)
      );
      setOrganizers(organizerIds);
      setSelectedOrganizers(new Set(organizerIds));
    } catch (error) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrganizer = (userId: string) => {
    setSelectedOrganizers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const promises: Promise<any>[] = [];

      for (const userId of selectedOrganizers) {
        if (!organizers.has(userId)) {
          promises.push(addOrganizer(organization.slug, userId));
        }
      }

      for (const userId of organizers) {
        if (!selectedOrganizers.has(userId)) {
          promises.push(removeOrganizer(organization.slug, userId));
        }
      }

      const results = await Promise.all(promises);
      
      const hasError = results.some((result) => !result.success);
      
      if (hasError) {
        toast.error("Alguns organizadores não foram atualizados");
      } else {
        toast.success("Organizadores atualizados com sucesso");
        setOpen(false);
        window.location.reload();
      }
    } catch (error) {
      toast.error("Erro ao atualizar organizadores");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges = () => {
    if (organizers.size !== selectedOrganizers.size) return true;
    for (const id of organizers) {
      if (!selectedOrganizers.has(id)) return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCog className="h-4 w-4 mr-2" />
          Gerenciar Organizadores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Gerenciar Organizadores</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Selecione os membros que terão permissões de organizador. Organizadores podem
            gerenciar membros, aprovar solicitações e enviar convites.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-base text-muted-foreground mb-2">
                Nenhum membro disponível para ser promovido a organizador.
              </p>
              <p className="text-sm text-muted-foreground">
                Convide membros primeiro.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {(() => {
                  const filteredMembers = members.filter((member) =>
                    member.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    member.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (filteredMembers.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Nenhum membro encontrado para "{searchTerm}"
                        </p>
                      </div>
                    );
                  }

                  return filteredMembers.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={member.user.id}
                        checked={selectedOrganizers.has(member.user.id)}
                        onCheckedChange={() => handleToggleOrganizer(member.user.id)}
                        className="mt-0.5"
                  />
                  <label
                    htmlFor={member.user.id}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={member.user.avatar_url || ""} />
                      <AvatarFallback className="text-sm font-medium">
                        {getInitials(member.user.first_name || member.user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {member.user.first_name && member.user.last_name
                          ? `${member.user.first_name} ${member.user.last_name}`
                          : member.user.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        @{member.user.username}
                      </p>
                    </div>
                  </label>
                </div>
              ));
                })()}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-6 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={submitting}
            className="min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={submitting || !hasChanges() || loading}
            className="min-w-[140px] bg-main hover:bg-main/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
