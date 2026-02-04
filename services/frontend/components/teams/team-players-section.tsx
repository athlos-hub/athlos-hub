"use client";

import { useState, useEffect } from "react";
import { Users, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/types/team";

interface UserInfo {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface TeamPlayersSectionProps {
  players: Player[];
  captainKeycloakId: string | null;
  isLoading?: boolean;
}

export function TeamPlayersSection({ 
  players, 
  captainKeycloakId,
  isLoading = false 
}: TeamPlayersSectionProps) {
  const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // TODO: Implementar busca de informações dos usuários via API
  // Por enquanto, mostramos apenas os IDs

  const getInitials = (user?: UserInfo) => {
    if (!user) return "?";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username?.slice(0, 2).toUpperCase() || "?";
  };

  const getDisplayName = (player: Player) => {
    const user = usersInfo[player.keycloak_id];
    if (user) {
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      return user.username;
    }
    return `Jogador`;
  };

  const isCaptain = (player: Player) => {
    return captainKeycloakId && player.keycloak_id === captainKeycloakId;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Elenco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Elenco ({players.length} jogador{players.length !== 1 ? 'es' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Nenhum jogador no time ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => {
              const user = usersInfo[player.keycloak_id];
              const playerIsCaptain = isCaptain(player);
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    playerIsCaptain ? 'border-main bg-main/5' : 'border-gray-200'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url || ""} alt={getDisplayName(player)} />
                    <AvatarFallback className={playerIsCaptain ? 'bg-main text-white' : ''}>
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {getDisplayName(player)}
                      </span>
                      {playerIsCaptain && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Shield className="w-3 h-3" />
                          Capitão
                        </Badge>
                      )}
                    </div>
                    {user?.username && (
                      <span className="text-xs text-gray-500">@{user.username}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
