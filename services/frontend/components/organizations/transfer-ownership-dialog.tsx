"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Loader2, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getOrganizationMembers, transferOwnership } from "@/actions/organizations";
import type { OrganizationResponse, OrganizationMemberResponse } from "@/types/organization";

interface TransferOwnershipDialogProps {
  organization: OrganizationResponse;
  onSuccess?: () => void;
}

export function TransferOwnershipDialog({ organization, onSuccess }: TransferOwnershipDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<OrganizationMemberResponse[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmationText, setConfirmationText] = useState("");

  const CONFIRMATION_PHRASE = "TRANSFERIR PROPRIEDADE";

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelectedMemberId("");
      setConfirmationText("");
    }
  }, [open]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getOrganizationMembers(organization.slug);
      const filteredMembers = data.members.filter(
        (m: OrganizationMemberResponse) => m.user.id !== organization.owner_id
      );
      setMembers(filteredMembers);
    } catch (error) {
      console.error("Erro ao carregar membros:", error);
      toast.error("Erro ao carregar membros");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedMemberId) {
      toast.error("Selecione um membro");
      return;
    }

    if (confirmationText !== CONFIRMATION_PHRASE) {
      toast.error("Digite a frase de confirmação corretamente");
      return;
    }

    setSubmitting(true);
    try {
      const result = await transferOwnership(organization.slug, selectedMemberId);
      
      if (result.success) {
        toast.success("Propriedade transferida com sucesso! Redirecionando...");
        setOpen(false);
        
        setTimeout(() => {
          router.push("/organizations");
          router.refresh();
        }, 1000);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || "Erro ao transferir propriedade");
      }
    } catch (error) {
      toast.error("Erro ao transferir propriedade");
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
      .substring(0, 2);
  };

  const selectedMember = members.find((m) => m.user.id === selectedMemberId);
  const isConfirmationValid = confirmationText === CONFIRMATION_PHRASE;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <UserCog className="h-4 w-4 mr-2" />
          Transferir Propriedade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Transferir Propriedade
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Esta ação é <strong>irreversível</strong>. Você perderá todos os privilégios de
            proprietário e não poderá desfazer esta ação.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base text-muted-foreground mb-2">
              Nenhum membro disponível para transferência.
            </p>
            <p className="text-sm text-muted-foreground">
              Adicione membros primeiro para poder transferir a propriedade.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Atenção:</strong> Ao transferir a propriedade, você se tornará um membro
                comum e não terá mais acesso às configurações de proprietário.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="member" className="text-sm font-medium">
                Selecione o novo proprietário
              </Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger id="member" className="w-full">
                  <SelectValue placeholder="Escolha um membro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user.first_name && member.user.last_name
                            ? `${member.user.first_name} ${member.user.last_name}`
                            : member.user.username}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          @{member.user.username}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMember && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Novo proprietário:
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMember.user.avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(
                        selectedMember.user.first_name || selectedMember.user.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedMember.user.first_name && selectedMember.user.last_name
                        ? `${selectedMember.user.first_name} ${selectedMember.user.last_name}`
                        : selectedMember.user.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedMember.user.username}
                    </p>
                    {selectedMember.user.email && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedMember.user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Digite <code className="text-destructive font-mono">{CONFIRMATION_PHRASE}</code>{" "}
                para confirmar
              </Label>
              <Input
                id="confirmation"
                type="text"
                placeholder="Digite aqui..."
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className={
                  confirmationText.length > 0 && !isConfirmationValid
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {confirmationText.length > 0 && !isConfirmationValid && (
                <p className="text-xs text-destructive">
                  A frase de confirmação não corresponde
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleTransfer}
            disabled={
              !selectedMemberId || !isConfirmationValid || submitting || loading || members.length === 0
            }
            className="min-w-40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <UserCog className="h-4 w-4 mr-2" />
                Transferir Propriedade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
