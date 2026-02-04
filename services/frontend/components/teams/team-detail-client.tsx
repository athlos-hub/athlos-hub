"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, Trophy, Building2, Shield, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamInviteDialog } from "./team-invite-dialog";
import { TeamPlayersSection } from "./team-players-section";
import { TeamRole, TeamStatus } from "@/types/team";
import type { TeamWithRole, TeamDetail } from "@/types/team";
import Link from "next/link";

interface TeamDetailClientProps {
  team: TeamWithRole | TeamDetail;
}

export function TeamDetailClient({ team }: TeamDetailClientProps) {
  const router = useRouter();
  
  const userRole = 'role' in team ? team.role : null;
  const isCaptain = userRole === TeamRole.CAPTAIN;
  const isPlayer = !!userRole;
  const isPending = team.status === TeamStatus.PENDING;

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/clubes/painel')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-600">{team.abbreviation}</p>
        </div>
      </div>

      {/* Card principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-linear-to-br from-main to-main/80 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{team.abbreviation}</span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{team.name}</CardTitle>
                  {isPending ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      Pendente
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                      Ativo
                    </Badge>
                  )}
                  {userRole && (
                    <Badge variant={isCaptain ? "default" : "secondary"} className="gap-1">
                      {isCaptain ? (
                        <>
                          <Shield className="w-3 h-3" />
                          Capitão
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" />
                          Jogador
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                {team.competition_name && (
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Trophy className="h-4 w-4 text-main" />
                    {team.competition_name}
                  </CardDescription>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            {team.organization_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-main" />
                {team.organization_name}
              </div>
            )}
            {team.modality_name && (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-main" />
                {team.modality_name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-main" />
              Criado em {new Date(team.created_at).toLocaleDateString("pt-BR")}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-main" />
              {team.players.length} jogador{team.players.length !== 1 ? 'es' : ''}
            </div>
          </div>

          {/* Ações do capitão */}
          {isCaptain && (
            <>
              <hr className="my-4 border-border" />
              <div className="flex flex-wrap gap-3">
                <TeamInviteDialog teamId={team.id} teamName={team.name} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção de jogadores */}
      <TeamPlayersSection 
        players={team.players}
        captainKeycloakId={team.team_captain}
      />
    </div>
  );
}
