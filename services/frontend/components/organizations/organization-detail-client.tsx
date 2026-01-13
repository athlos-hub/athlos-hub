"use client";

import { Building2, Calendar, Lock, Globe, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditOrganizationDialog } from "./edit-organization-dialog";
import { SettingsDialog } from "./settings-dialog";
import { MembersSection } from "./members-section";
import { OrgRole } from "@/types/organization";
import type { OrganizationResponse, OrganizationWithRole, OrganizationAdminWithRole, OrganizationGetPublic } from "@/types/organization";

interface OrganizationDetailClientProps {
    organization: OrganizationResponse | OrganizationWithRole | OrganizationAdminWithRole | OrganizationGetPublic;
}

export function OrganizationDetailClient({ organization }: OrganizationDetailClientProps) {
    const userRole = 'role' in organization ? organization.role : null;
    const isOwner = userRole === OrgRole.OWNER;
    const isAdmin = userRole === OrgRole.OWNER || userRole === OrgRole.ORGANIZER;
    
    const isFullOrganization = 'status' in organization && 'join_policy' in organization;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={organization.logo_url || ""} alt={organization.name} />
                                <AvatarFallback>
                                    <Building2 className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{organization.name}</CardTitle>
                                <CardDescription>{organization.description}</CardDescription>
                            </div>
                        </div>
                        <Badge variant={organization.privacy === "PRIVATE" ? "secondary" : "outline"}>
                            {organization.privacy === "PRIVATE" ? (
                                <>
                                    <Lock className="h-3 w-3 mr-1" />
                                    Privada
                                </>
                            ) : (
                                <>
                                    <Globe className="h-3 w-3 mr-1" />
                                    Pública
                                </>
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                        {'created_at' in organization && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Criada em {new Date(organization.created_at).toLocaleDateString("pt-BR")}
                            </div>
                        )}
                    </div>

                    {isOwner && isFullOrganization && (
                        <>
                            <hr className="my-4 border-border" />
                            <div className="flex gap-3">
                                <EditOrganizationDialog organization={organization as OrganizationResponse} />
                                <SettingsDialog organization={organization as OrganizationResponse} />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {isFullOrganization && (
                <MembersSection 
                    organization={organization as OrganizationResponse & { role?: string }} 
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                />
            )}

            <Card>
                <CardHeader>
                    <CardTitle>
                        <Trophy className="h-5 w-5 inline mr-2" />
                        Competições
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Nenhuma competição ainda</p>
                </CardContent>
            </Card>
        </div>
    );
}
