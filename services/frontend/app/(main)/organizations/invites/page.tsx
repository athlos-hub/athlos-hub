"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, X, Check, Loader2 } from "lucide-react";
import { getMyInvites, getMyRequests, acceptOrganizationInvite, declineOrganizationInvite, cancelJoinRequest } from "@/actions/organizations";
import { OrganizationInviteResponse, OrganizationRequestResponse } from "@/types/organization";
import { toast } from "sonner";

type TabType = "invites" | "requests";

export default function OrganizationInvitesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("invites");
  const [invites, setInvites] = useState<OrganizationInviteResponse[]>([]);
  const [requests, setRequests] = useState<OrganizationRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invitesData, requestsData] = await Promise.all([
        getMyInvites(),
        getMyRequests(),
      ]);
      setInvites(invitesData);
      setRequests(requestsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (slug: string) => {
    setActioningId(slug);
    try {
      await acceptOrganizationInvite(slug);
      toast.success("Convite aceito com sucesso!");
      router.push(`/organizations/${slug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao aceitar convite";
      toast.error(message);
      setActioningId(null);
    }
  };

  const handleDeclineInvite = async (slug: string) => {
    setActioningId(slug);
    try {
      await declineOrganizationInvite(slug);
      toast.success("Convite recusado");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao recusar convite";
      toast.error(message);
    } finally {
      setActioningId(null);
    }
  };

  const handleCancelRequest = async (slug: string) => {
    setActioningId(slug);
    try {
      await cancelJoinRequest(slug);
      toast.success("Solicitação cancelada");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao cancelar solicitação";
      toast.error(message);
    } finally {
      setActioningId(null);
    }
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      return "há menos de 1 hora";
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
    } else if (diffInDays < 30) {
      const days = Math.floor(diffInDays);
      return `há ${days} ${days === 1 ? "dia" : "dias"}`;
    } else {
      return date.toLocaleDateString("pt-BR");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Convites e Solicitações
          </h1>
          <p className="text-gray-600">
            Gerencie seus convites de organizações e solicitações pendentes
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("invites")}
            className={`pb-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "invites"
                ? "border-main text-main"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Mail className="w-5 h-5" />
            Convites Recebidos
            {invites.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invites.length}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-main text-main"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Send className="w-5 h-5" />
            Minhas Solicitações
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {requests.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "invites" && (
            <>
              {invites.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">Nenhum convite pendente</p>
                  </div>
                </Card>
              ) : (
                invites.map((invite) => (
                  <Card key={invite.id} className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={invite.organization.logo_url || ""} />
                          <AvatarFallback>
                            {invite.organization.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {invite.organization.name}
                          </h3>
                          {invite.organization.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {invite.organization.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Convite recebido {formatRelativeDate(invite.invited_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="default"
                          className="bg-main hover:bg-main/90"
                          onClick={() => handleAcceptInvite(invite.organization.slug)}
                          disabled={actioningId === invite.organization.slug}
                        >
                          {actioningId === invite.organization.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Aceitar
                            </>
                          )}
                        </Button>
                        <Button
                          size="default"
                          variant="outline"
                          onClick={() => handleDeclineInvite(invite.organization.slug)}
                          disabled={actioningId === invite.organization.slug}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </>
          )}

          {activeTab === "requests" && (
            <>
              {requests.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <Send className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">Nenhuma solicitação pendente</p>
                  </div>
                </Card>
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={request.organization.logo_url || ""} />
                        <AvatarFallback>
                          {request.organization.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {request.organization.name}
                        </h3>
                        {request.organization.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {request.organization.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Solicitação enviada {formatRelativeDate(request.requested_at)}
                        </p>
                      </div>

                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => handleCancelRequest(request.organization.slug)}
                        disabled={actioningId === request.organization.slug}
                      >
                        {actioningId === request.organization.slug ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
