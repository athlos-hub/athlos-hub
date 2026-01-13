"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Link2Off } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { joinOrganizationViaLink } from "@/actions/organizations";

interface JoinViaLinkClientProps {
  organizationSlug: string;
}

type JoinStatus = "loading" | "success" | "error" | "policy_error" | "already_member";

export function JoinViaLinkClient({ organizationSlug }: JoinViaLinkClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const attemptJoin = async () => {
      try {
        const result = await joinOrganizationViaLink(organizationSlug);
        
        if (result.success) {
          setStatus("success");
          setTimeout(() => {
            router.push(`/organizations/${organizationSlug}`);
          }, 2000);
        } else {
          const error = result.error?.toLowerCase() || "";
          
          if (error.includes("política") || error.includes("policy") || error.includes("não permite")) {
            setStatus("policy_error");
            setErrorMessage("Esta organização não aceita entrada via link de convite.");
          } else if (error.includes("já é membro") || error.includes("already")) {
            setStatus("already_member");
            setErrorMessage("Você já é membro desta organização.");
          } else {
            setStatus("error");
            setErrorMessage(result.error || "Erro ao entrar na organização");
          }
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage("Erro inesperado ao processar o convite");
      }
    };

    attemptJoin();
  }, [organizationSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Entrar na Organização</CardTitle>
          <CardDescription>
            Processando seu convite para entrar na organização...
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Processando seu convite...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Bem-vindo!</h3>
                <p className="text-muted-foreground">
                  Você agora é membro da organização. Redirecionando...
                </p>
              </div>
            </div>
          )}

          {status === "already_member" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertDescription className="text-blue-700">
                  {errorMessage}
                </AlertDescription>
              </Alert>
              <Button onClick={() => router.push(`/organizations/${organizationSlug}`)}>
                Ver Organização
              </Button>
            </div>
          )}

          {status === "policy_error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Link2Off className="h-12 w-12 text-yellow-600" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Link não disponível</h3>
                  <p className="text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertDescription className="text-yellow-700">
                    Esta organização pode aceitar solicitações de entrada ou convites diretos. 
                    Visite a página da organização para solicitar acesso.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => router.push(`/organizations/${organizationSlug}`)}>
                  Ver Organização
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <XCircle className="h-12 w-12 text-red-600" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Erro ao processar convite</h3>
                  <p className="text-muted-foreground">{errorMessage}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push("/organizations")}>
                    Ver Organizações
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
