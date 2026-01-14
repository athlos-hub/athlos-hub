"use client";

import { useState, useEffect } from "react";
import { Building2, Calendar, Lock, Globe, Trophy, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EditOrganizationDialog } from "./edit-organization-dialog";
import { SettingsDialog } from "./settings-dialog";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import { ManageOrganizersDialog } from "./manage-organizers-dialog";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";
import { InviteLinkDialog } from "./invite-link-dialog";
import { LeaveOrganizationDialog } from "./leave-organization-dialog";
import { MembersSection } from "./members-section";
import { OrganizationOverview } from "./organization-overview";
import { OrgRole, OrganizationStatus } from "@/types/organization";
import type { OrganizationResponse, OrganizationWithRole, OrganizationAdminWithRole, OrganizationGetPublic } from "@/types/organization";

interface OrganizationDetailClientProps {
    organization: OrganizationResponse | OrganizationWithRole | OrganizationAdminWithRole | OrganizationGetPublic;
}

export function OrganizationDetailClient({ organization }: OrganizationDetailClientProps) {
    const userRole = 'role' in organization ? organization.role : null;
    const isOwner = userRole === OrgRole.OWNER;
    const isOrganizer = userRole === OrgRole.ORGANIZER;
    const isAdmin = isOwner || isOrganizer;
    
    const isFullOrganization = 'status' in organization && 'join_policy' in organization;
    const isPending = isFullOrganization && organization.status === OrganizationStatus.PENDING;

    return (
        <div className="space-y-6">
            {isPending && isOwner && (
                <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="h-4 w-4 text-yellow-700" />
                    <AlertTitle className="text-yellow-700">Organização Pendente de Aprovação</AlertTitle>
                    <AlertDescription className="text-yellow-600">
                        Sua organização está aguardando aprovação dos administradores. 
                        Assim que aprovada, ela ficará visível publicamente e você poderá convidar membros.
                    </AlertDescription>
                </Alert>
            )}
            
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
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl">{organization.name}</CardTitle>
                                    {isPending && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                            Pendente
                                        </Badge>
                                    )}
                                </div>
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

                    {isOwner && !isOrganizer && isFullOrganization && (
                        <>
                            <hr className="my-4 border-border" />
                            <div className="flex flex-wrap gap-3">
                                <EditOrganizationDialog organization={organization as OrganizationResponse} />
                                <SettingsDialog organization={organization as OrganizationResponse} />
                                {!isPending && (
                                    <>
                                        <InviteLinkDialog organization={organization as OrganizationResponse} />
                                        <ManageOrganizersDialog organization={organization as OrganizationResponse} />
                                        <TransferOwnershipDialog organization={organization as OrganizationResponse} />
                                    </>
                                )}
                                <DeleteOrganizationDialog 
                                    organizationName={organization.name}
                                    organizationSlug={organization.slug}
                                />
                            </div>
                        </>
                    )}

                    {isOrganizer && !isOwner && isFullOrganization && !isPending && (
                        <>
                            <hr className="my-4 border-border" />
                            <div className="flex flex-wrap gap-3">
                                <InviteLinkDialog organization={organization as OrganizationResponse} />
                                <LeaveOrganizationDialog 
                                    organizationSlug={organization.slug}
                                    organizationName={organization.name}
                                    isOwner={false}
                                    isOrganizer={true}
                                />
                            </div>
                        </>
                    )}

                    {!isOwner && !isOrganizer && userRole && (
                        <>
                            <hr className="my-4 border-border" />
                            <div className="flex flex-wrap gap-3">
                                <LeaveOrganizationDialog 
                                    organizationSlug={organization.slug}
                                    organizationName={organization.name}
                                    isOwner={isOwner}
                                    isOrganizer={isOrganizer}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <OrganizationOverview slug={organization.slug} isMember={!!userRole} />

            {isFullOrganization && !isPending && (
                <MembersSection 
                    organization={organization as OrganizationResponse & { role?: string }} 
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                    isOrganizer={isOrganizer}
                />
            )}

            {isPending && isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Membros
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        <p>A gestão de membros estará disponível após a aprovação da organização.</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Competições
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isPending && isOwner ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p>A criação de competições estará disponível após a aprovação da organização.</p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Nenhuma competição ainda</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
