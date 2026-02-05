"use client";

import Link from "next/link";
import { TeamListItem, TeamStatus, TeamRole } from "@/types/team";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Clock, Trophy, UserPlus, CheckCircle, XCircle } from "lucide-react";

interface TeamCardProps {
  team: TeamListItem;
  showRole?: boolean;
}

export function TeamCard({ team, showRole = true }: TeamCardProps) {
  const getRoleBadge = (role: TeamRole) => {
    const roleConfig = {
      [TeamRole.CAPTAIN]: { label: "Capitão", variant: "default" as const, icon: Shield },
      [TeamRole.PLAYER]: { label: "Jogador", variant: "outline" as const, icon: Users },
    };
    
    return roleConfig[role] || { label: role, variant: "outline" as const, icon: Users };
  };

  const getStatusBadge = (status: TeamStatus) => {
    const statusConfig = {
      [TeamStatus.PENDING]: { 
        label: "Pendente", 
        variant: "outline" as const, 
        className: "bg-yellow-50 text-yellow-700 border-yellow-300",
        icon: Clock 
      },
      [TeamStatus.RECRUITING]: { 
        label: "Recrutando", 
        variant: "outline" as const, 
        className: "bg-blue-50 text-blue-700 border-blue-300",
        icon: UserPlus 
      },
      [TeamStatus.READY]: { 
        label: "Pronto", 
        variant: "outline" as const, 
        className: "bg-green-50 text-green-700 border-green-300",
        icon: CheckCircle 
      },
      [TeamStatus.APPROVED]: { 
        label: "Aprovado", 
        variant: "default" as const, 
        className: "bg-green-500 text-white border-green-500",
        icon: CheckCircle 
      },
      [TeamStatus.REJECTED]: { 
        label: "Rejeitado", 
        variant: "destructive" as const, 
        className: "bg-red-50 text-red-700 border-red-300",
        icon: XCircle 
      },
      [TeamStatus.ACTIVE]: { 
        label: "Ativo", 
        variant: "default" as const, 
        className: "bg-green-500 text-white border-green-500",
        icon: CheckCircle 
      },
    };
    return statusConfig[status] || statusConfig[TeamStatus.PENDING];
  };

  const roleConfig = getRoleBadge(team.role);
  const statusConfig = getStatusBadge(team.status);
  const RoleIcon = roleConfig.icon;
  const StatusIcon = statusConfig.icon;

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
                  <Badge variant={statusConfig.variant} className={`${statusConfig.className} shrink-0`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
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
