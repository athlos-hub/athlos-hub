"use client";

import Image from "next/image";
import Link from "next/link";
import { OrganizationGetPublic, OrganizationPrivacy, OrganizationStatus, OrgRole } from "@/types/organization";
import { Badge } from "@/components/ui/badge";
import { Building2, Lock, Globe, Clock } from "lucide-react";

interface OrganizationCardProps {
  organization: OrganizationGetPublic & { role?: string; status?: OrganizationStatus };
  showRole?: boolean;
}

export function OrganizationCard({ organization, showRole = false }: OrganizationCardProps) {
  const isPrivate = organization.privacy === OrganizationPrivacy.PRIVATE;
  const isPending = organization.status === OrganizationStatus.PENDING;
  
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      [OrgRole.OWNER]: { label: "Proprietário", variant: "default" as const },
      [OrgRole.ORGANIZER]: { label: "Organizador", variant: "secondary" as const },
      [OrgRole.MEMBER]: { label: "Membro", variant: "outline" as const },
    };
    
    return roleConfig[role as OrgRole] || { label: role, variant: "outline" as const };
  };

  return (
    <Link href={`/organizations/${organization.slug}`}>
      <div className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-main cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-lg bg-linear-to-br from-main to-main/80 flex items-center justify-center shrink-0 overflow-hidden">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization.name}
                fill
                className="object-cover"
              />
            ) : (
              <Building2 className="w-8 h-8 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between min-h-16">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-main transition-colors truncate">
                    {organization.name}
                  </h3>
                  {isPending && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isPrivate ? (
                    <div title="Privada"><Lock className="w-4 h-4 text-gray-500" /></div>
                  ) : (
                    <div title="Pública"><Globe className="w-4 h-4 text-gray-500" /></div>
                  )}
                </div>
              </div>

              {organization.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {organization.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-mono">
                @{organization.slug}
              </span>
              
              {showRole && organization.role && (
                <Badge variant={getRoleBadge(organization.role).variant}>
                  {getRoleBadge(organization.role).label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
