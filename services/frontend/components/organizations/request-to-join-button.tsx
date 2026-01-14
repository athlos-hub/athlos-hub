"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, CheckCircle } from "lucide-react";
import { requestToJoinOrganization, cancelJoinRequest, getMyRequests } from "@/actions/organizations";
import { toast } from "sonner";

interface RequestToJoinButtonProps {
  organizationSlug: string;
  organizationName: string;
}

export function RequestToJoinButton({ organizationSlug, organizationName }: RequestToJoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isCheckingRequest, setIsCheckingRequest] = useState(true);

  useEffect(() => {
    checkPendingRequest();
  }, [organizationSlug]);

  async function checkPendingRequest() {
    try {
      setIsCheckingRequest(true);
      const requests = await getMyRequests();
      const pendingRequest = requests.find(
        (req) => req.organization.slug === organizationSlug && req.status === "PENDING"
      );
      setHasPendingRequest(!!pendingRequest);
    } catch (error) {
      console.error("Error checking pending request:", error);
    } finally {
      setIsCheckingRequest(false);
    }
  }

  async function handleRequest() {
    try {
      setIsLoading(true);
      const result = await requestToJoinOrganization(organizationSlug);
      
      if (result.success) {
        toast.success(`Solicitação enviada! Aguarde a aprovação dos administradores de ${organizationName}.`);
        setHasPendingRequest(true);
      } else {
        toast.error(result.error || "Erro ao enviar solicitação");
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelRequest() {
    try {
      setIsLoading(true);
      const result = await cancelJoinRequest(organizationSlug);
      
      if (result.success) {
        toast.success(result.message || "Solicitação cancelada");
        setHasPendingRequest(false);
      } else {
        toast.error(result.error || "Erro ao cancelar solicitação");
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingRequest) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Verificando...
      </Button>
    );
  }

  if (hasPendingRequest) {
    return (
      <Button
        variant="outline"
        onClick={handleCancelRequest}
        disabled={isLoading}
        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cancelando...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Solicitação Pendente
          </>
        )}
      </Button>
    );
  }

  return (
    <Button onClick={handleRequest} disabled={isLoading} className="bg-main hover:bg-main/90">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Enviando...
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Solicitar Participação
        </>
      )}
    </Button>
  );
}
