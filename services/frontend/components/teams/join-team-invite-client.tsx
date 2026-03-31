"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateTeamInvite, acceptTeamInvite } from "@/actions/teams";
import { InviteValidationResponse } from "@/types/team";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface JoinTeamInviteClientProps {
  inviteToken: string;
}

type InviteStatus = "validating" | "valid" | "invalid" | "accepting" | "success" | "error";

export function JoinTeamInviteClient({ inviteToken }: JoinTeamInviteClientProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<InviteStatus>("validating");
  const [inviteData, setInviteData] = useState<InviteValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [addedToOrg, setAddedToOrg] = useState(false);

  // Validar convite ao carregar (público, sem autenticação)
  useEffect(() => {
    const validateInvite = async () => {
      try {
        const result = await validateTeamInvite(inviteToken);
        
        if (result.valid && result.team_id) {
          setInviteData(result);
          setStatus("valid");
        } else {
          setStatus("invalid");
          setErrorMessage(result.message || result.error || "Convite inválido ou expirado");
        }
      } catch (error) {
        setStatus("invalid");
        setErrorMessage("Erro ao validar convite");
      }
    };

    validateInvite();
  }, [inviteToken]);

  const handleAcceptInvite = async () => {
    if (sessionStatus !== "authenticated") {
      // Redirecionar para login, depois voltar aqui
      router.push(
        `/auth/login?callbackUrl=${encodeURIComponent(`/convite/time/${inviteToken}`)}`
      );
      return;
    }

    setStatus("accepting");
    try {
      const result = await acceptTeamInvite(inviteToken);
      
      if (result.success) {
        setStatus("success");
        setAddedToOrg(result.added_to_organization || false);
        toast.success(result.message);
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push(`/clubes/${result.team_id}`);
        }, 2000);
      }
    } catch (error: any) {
      setStatus("error");
      const errorMsg = error.message || "Erro ao aceitar convite";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleDecline = () => {
    router.push("/clubes/painel");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Convite de Time</CardTitle>
          <CardDescription>
            {status === "validating" && "Validando convite..."}
            {status === "valid" && "Você foi convidado para entrar em um time"}
            {status === "invalid" && "Convite inválido"}
            {status === "accepting" && "Processando..."}
            {status === "success" && "Convite aceito com sucesso!"}
            {status === "error" && "Erro ao processar convite"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Validando */}
          {status === "validating" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Validando seu convite...</p>
            </div>
          )}

          {/* Convite válido - mostra detalhes */}
          {status === "valid" && inviteData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time</p>
                    <p className="text-sm font-medium text-gray-700">{inviteData.team_name}</p>
                  </div>
                  
                  {inviteData.organization_name && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Organização</p>
                      <p className="text-sm font-medium text-gray-700">{inviteData.organization_name}</p>
                    </div>
                  )}
                  
                  {inviteData.competition_name && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Competição</p>
                      <p className="text-sm font-medium text-gray-700">{inviteData.competition_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ao aceitar este convite, você se tornará membro deste time
                  {inviteData.organization_name && " e da organização " + inviteData.organization_name}.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                {sessionStatus === "authenticated" ? (
                  <>
                    <Button onClick={handleAcceptInvite} className="w-full bg-main hover:bg-main/90">
                      Aceitar Convite
                    </Button>
                    <Button onClick={handleDecline} variant="outline" className="w-full">
                      Recusar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleAcceptInvite} className="w-full">
                      Fazer Login para Aceitar
                    </Button>
                    <Button onClick={handleDecline} variant="outline" className="w-full">
                      Voltar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Aceitando convite */}
          {status === "accepting" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Entrando no time...</p>
            </div>
          )}

          {/* Sucesso */}
          {status === "success" && inviteData && (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Bem-vindo ao time!</h3>
                <p className="text-muted-foreground mb-3">
                  Você agora faz parte do time <strong>{inviteData.team_name}</strong>
                </p>
                {addedToOrg && inviteData.organization_name && (
                  <Alert className="bg-blue-50 border-blue-300 mb-3">
                    <AlertDescription className="text-blue-700 text-sm">
                      Você também foi adicionado à organização <strong>{inviteData.organization_name}</strong>
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">Redirecionando...</p>
              </div>
            </div>
          )}

          {/* Convite inválido */}
          {status === "invalid" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <XCircle className="h-12 w-12 text-red-600" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Convite Inválido</h3>
                  <p className="text-muted-foreground">{errorMessage}</p>
                </div>
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertDescription className="text-yellow-700 text-sm">
                    Este convite pode ter expirado ou já foi usado.
                    Entre em contato com o capitão do time para receber um novo convite.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => router.push("/clubes/painel")} className="w-full bg-main hover:bg-main/90">
                  Ir para Meus Times
                </Button>
              </div>
            </div>
          )}

          {/* Erro ao aceitar */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <XCircle className="h-12 w-12 text-red-600" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Erro ao Aceitar Convite</h3>
                  <p className="text-muted-foreground">{errorMessage}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/clubes/painel")}
                    className="flex-1"
                  >
                    Meus Times
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
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
