"use client";

import { Users, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TeamMember } from "@/types/team";

interface TeamPlayersSectionProps {
  members: TeamMember[];
  isLoading?: boolean;
}

export function TeamPlayersSection({ 
  members, 
  isLoading = false 
}: TeamPlayersSectionProps) {

  const getInitials = (member: TeamMember) => {
    const { first_name, last_name, username } = member.user;
    if (first_name && last_name) {
      return `${first_name[0]}${last_name[0]}`.toUpperCase();
    }
    return username?.slice(0, 2).toUpperCase() || "?";
  };

  const getDisplayName = (member: TeamMember) => {
    const { first_name, last_name, username } = member.user;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return username || "Jogador";
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
          Elenco ({members.length} jogador{members.length !== 1 ? 'es' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Nenhum jogador no time ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => {
              const playerIsCaptain = member.is_captain;
              
              return (
                <div 
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    playerIsCaptain ? 'border-main bg-main/5' : 'border-gray-200'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user.avatar_url || ""} alt={getDisplayName(member)} />
                    <AvatarFallback className={playerIsCaptain ? 'bg-main text-white' : ''}>
                      {getInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {getDisplayName(member)}
                      </span>
                      {playerIsCaptain && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Shield className="w-3 h-3" />
                          Capitão
                        </Badge>
                      )}
                    </div>
                    {member.user.username && (
                      <span className="text-xs text-gray-500">@{member.user.username}</span>
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
