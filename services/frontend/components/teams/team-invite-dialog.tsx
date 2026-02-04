"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Copy, Check, Trash2, Loader2, Plus, Calendar, Hash } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createTeamInvite, listTeamInvites, revokeTeamInvite } from "@/actions/teams";
import type { TeamInvite } from "@/types/team";
import { InviteStatus } from "@/types/team";

interface TeamInviteDialogProps {
  teamId: string;
  teamName: string;
}

export function TeamInviteDialog({ teamId, teamName }: TeamInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<string>("unlimited");

  useEffect(() => {
    if (open) {
      loadInvites();
    }
  }, [open]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const data = await listTeamInvites(teamId);
      setInvites(data);
    } catch (error) {
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const data = {
        expires_in_days: expiresInDays,
        max_uses: maxUses === "unlimited" ? null : parseInt(maxUses, 10),
      };
      
      const invite = await createTeamInvite(teamId, data);
      setInvites((prev) => [invite, ...prev]);
      toast.success("Convite criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (invite: TeamInvite) => {
    try {
      await navigator.clipboard.writeText(invite.invite_url);
      setCopied(invite.id);
      toast.success("Link copiado!");
      
      setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleRevokeInvite = async (inviteToken: string) => {
    try {
      const result = await revokeTeamInvite(teamId, inviteToken);
      if (result.success) {
        setInvites((prev) => prev.filter((inv) => inv.invite_token !== inviteToken));
        toast.success("Convite revogado");
      } else {
        toast.error(result.error || "Erro ao revogar convite");
      }
    } catch {
      toast.error("Erro ao revogar convite");
    }
  };

  const getStatusBadge = (status: InviteStatus) => {
    const config = {
      [InviteStatus.PENDING]: { label: "Ativo", variant: "default" as const, className: "bg-green-100 text-green-700" },
      [InviteStatus.ACCEPTED]: { label: "Aceito", variant: "secondary" as const, className: "bg-blue-100 text-blue-700" },
      [InviteStatus.EXPIRED]: { label: "Expirado", variant: "outline" as const, className: "bg-gray-100 text-gray-600" },
      [InviteStatus.REVOKED]: { label: "Revogado", variant: "destructive" as const, className: "bg-red-100 text-red-700" },
    };
    return config[status] || config[InviteStatus.PENDING];
  };

  const activeInvites = invites.filter((inv) => inv.status === InviteStatus.PENDING);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="h-4 w-4 mr-2" />
          Gerenciar Convites
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Convites do Time</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Gere e gerencie links de convite para {teamName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <LinkIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Apenas membros da organização podem aceitar convites e entrar no time.
            </AlertDescription>
          </Alert>

          {/* Criar novo convite */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium">Criar Novo Convite</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Expira em</Label>
                <Select value={expiresInDays.toString()} onValueChange={(v) => setExpiresInDays(parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Máximo de usos</Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Ilimitado</SelectItem>
                    <SelectItem value="1">1 uso</SelectItem>
                    <SelectItem value="5">5 usos</SelectItem>
                    <SelectItem value="10">10 usos</SelectItem>
                    <SelectItem value="25">25 usos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateInvite} 
              disabled={creating}
              className="w-full bg-main hover:bg-main/90"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Gerar Novo Convite
            </Button>
          </div>

          {/* Lista de convites */}
          <div className="space-y-3">
            <h4 className="font-medium">Convites ({activeInvites.length} ativos)</h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum convite criado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {invites.map((invite) => {
                  const statusConfig = getStatusBadge(invite.status as InviteStatus);
                  const isActive = invite.status === InviteStatus.PENDING;
                  
                  return (
                    <div 
                      key={invite.id} 
                      className={`p-3 border rounded-lg ${isActive ? 'bg-white' : 'bg-gray-50 opacity-75'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                            {invite.max_uses && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {invite.use_count}/{invite.max_uses}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            Expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {isActive && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopyLink(invite)}
                              >
                                {copied === invite.id ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRevokeInvite(invite.invite_token)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
