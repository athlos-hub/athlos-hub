"use client";

import Link from "next/link";
import { TeamListItem, TeamStatus, TeamRole } from "@/types/team";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Clock, Trophy } from "lucide-react";

interface TeamCardProps {
  team: TeamListItem;
  showRole?: boolean;
}

export function TeamCard({ team, showRole = true }: TeamCardProps) {
  const isPending = team.status === TeamStatus.PENDING;
  
  const getRoleBadge = (role: TeamRole) => {
    const roleConfig = {
      [TeamRole.CAPTAIN]: { label: "Capitão", variant: "default" as const, icon: Shield },
      [TeamRole.PLAYER]: { label: "Jogador", variant: "outline" as const, icon: Users },
    };
    
    return roleConfig[role] || { label: role, variant: "outline" as const, icon: Users };
  };

  const roleConfig = getRoleBadge(team.role);
  const RoleIcon = roleConfig.icon;

  return (
    <Link href={`/clubes/${team.id}`}>
      <div className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-main cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-lg bg-linear-to-br from-main to-main/80 flex items-center justify-center shrink-0 overflow-hidden">
            <span className="text-white font-bold text-xl">{team.abbreviation}</span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between min-h-16">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-main transition-colors truncate">
                    {team.name}
                  </h3>
                  {isPending && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </div>

              {team.competition_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Trophy className="w-4 h-4 text-main" />
                  <span className="truncate">{team.competition_name}</span>
                </div>
              )}

              {team.organization_name && (
                <p className="text-sm text-gray-500 truncate">
                  {team.organization_name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-3">
              {team.player_count !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{team.player_count} jogador{team.player_count !== 1 ? 'es' : ''}</span>
                </div>
              )}
              
              {showRole && team.role && (
                <Badge variant={roleConfig.variant} className="gap-1">
                  <RoleIcon className="w-3 h-3" />
                  {roleConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
