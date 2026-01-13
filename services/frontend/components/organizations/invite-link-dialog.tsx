"use client";

import { useState } from "react";
import { Link as LinkIcon, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { OrganizationResponse } from "@/types/organization";
import { OrganizationJoinPolicy } from "@/types/organization";

interface InviteLinkDialogProps {
  organization: OrganizationResponse;
}

export function InviteLinkDialog({ organization }: InviteLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const allowsLink = organization.join_policy && [
    OrganizationJoinPolicy.LINK_ONLY,
    OrganizationJoinPolicy.INVITE_AND_LINK,
    OrganizationJoinPolicy.REQUEST_AND_LINK,
    OrganizationJoinPolicy.ALL,
  ].includes(organization.join_policy);

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/organizations/${organization.slug}/join-link`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  if (!allowsLink) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="h-4 w-4 mr-2" />
          Link de Convite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Link de Convite Público</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Compartilhe este link para permitir que pessoas entrem na organização diretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <LinkIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Qualquer pessoa com este link poderá entrar na organização como membro.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="invite-link" className="text-sm font-medium">
              Link de Convite
            </Label>
            <div className="flex gap-2">
              <Input
                id="invite-link"
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique no ícone para copiar o link
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">Como usar:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copie o link acima</li>
              <li>Compartilhe com as pessoas que deseja adicionar</li>
              <li>Quando clicarem no link, entrarão automaticamente na organização</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="min-w-[100px]"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
