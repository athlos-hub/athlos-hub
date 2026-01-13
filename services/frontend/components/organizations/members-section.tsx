"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteMemberDialog } from "./invite-member-dialog";
import { getOrganizationMembers, getPendingRequests, getSentInvites, approveJoinRequest, rejectJoinRequest, getOrganizationOrganizers } from "@/actions/organizations";
import { OrganizationResponse, OrganizationJoinPolicy, OrgRole } from "@/types/organization";
import { toast } from "sonner";

interface MembersSectionProps {
    organization: OrganizationResponse & { role?: string };
    isAdmin: boolean;
    isOwner: boolean;
}

export function MembersSection({ organization, isAdmin, isOwner }: MembersSectionProps) {
    const [members, setMembers] = useState<any[]>([]);
    const [organizers, setOrganizers] = useState<Set<string>>(new Set());
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentInvites, setSentInvites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const joinPolicy = organization.join_policy;
    const allowsInvite = joinPolicy && [
        OrganizationJoinPolicy.INVITE_ONLY,
        OrganizationJoinPolicy.INVITE_AND_REQUEST,
        OrganizationJoinPolicy.INVITE_AND_LINK,
        OrganizationJoinPolicy.ALL
    ].includes(joinPolicy);

    const allowsRequest = joinPolicy && [
        OrganizationJoinPolicy.REQUEST_ONLY,
        OrganizationJoinPolicy.INVITE_AND_REQUEST,
        OrganizationJoinPolicy.REQUEST_AND_LINK,
        OrganizationJoinPolicy.ALL
    ].includes(joinPolicy);

    useEffect(() => {
        loadData();
    }, [organization.slug]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [membersData, organizersData, requestsData, invitesData] = await Promise.all([
                getOrganizationMembers(organization.slug),
                getOrganizationOrganizers(organization.slug),
                allowsRequest && isAdmin ? getPendingRequests(organization.slug).catch(() => ({ total: 0, requests: [] })) : Promise.resolve({ total: 0, requests: [] }),
                allowsInvite && isAdmin ? getSentInvites(organization.slug).catch(() => ({ total: 0, requests: [] })) : Promise.resolve({ total: 0, requests: [] })
            ]);

            setMembers(membersData.members || []);
            setOrganizers(new Set(organizersData.organizers?.map((org: any) => org.user.id) || []));
            setPendingRequests(requestsData.requests || []);
            setSentInvites(invitesData.requests || []);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar membros");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveRequest = async (userId: string) => {
        try {
            const result = await approveJoinRequest(organization.slug, userId);
            if (result.success) {
                toast.success("Solicitação aprovada!");
                loadData();
            } else {
                toast.error(result.error || "Erro ao aprovar solicitação");
            }
        } catch (error) {
            toast.error("Erro ao aprovar solicitação");
        }
    };

    const handleRejectRequest = async (userId: string) => {
        try {
            const result = await rejectJoinRequest(organization.slug, userId);
            if (result.success) {
                toast.success("Solicitação rejeitada");
                loadData();
            } else {
                toast.error(result.error || "Erro ao rejeitar solicitação");
            }
        } catch (error) {
            toast.error("Erro ao rejeitar solicitação");
        }
    };

    const totalPages = Math.ceil(members.length / itemsPerPage);
    const paginatedMembers = members.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            <Users className="h-5 w-5 inline mr-2" />
                            Membros
                        </CardTitle>
                        <CardDescription>
                            {members.length} {members.length === 1 ? "membro" : "membros"} na organização
                        </CardDescription>
                    </div>
                    {isAdmin && allowsInvite && (
                        <InviteMemberDialog 
                            organizationSlug={organization.slug} 
                            onSuccess={loadData}
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-muted-foreground">Carregando...</p>
                ) : (
                    <Tabs 
                        defaultValue="members" 
                        className="w-full"
                        onValueChange={() => setCurrentPage(1)}
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="members">
                                Membros ({members.length})
                            </TabsTrigger>
                            {allowsRequest && isAdmin && (
                                <TabsTrigger value="requests">
                                    Solicitações ({pendingRequests.length})
                                </TabsTrigger>
                            )}
                            {allowsInvite && isAdmin && (
                                <TabsTrigger value="invites">
                                    Convites ({sentInvites.length})
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* Lista de Membros */}
                        <TabsContent value="members" className="space-y-4">
                            {paginatedMembers.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    Nenhum membro ainda
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {paginatedMembers.map((member: any) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={member.user?.avatar_url} />
                                                        <AvatarFallback>
                                                            {member.user?.username?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{member.user?.username}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {member.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {member.is_owner ? (
                                                        <Badge variant="default">Proprietário</Badge>
                                                    ) : organizers.has(member.user?.id) ? (
                                                        <Badge variant="secondary">Organizador</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Membro</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 pt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Anterior
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                Página {currentPage} de {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Próxima
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </TabsContent>

                        {allowsRequest && isAdmin && (
                            <TabsContent value="requests" className="space-y-4">
                                {pendingRequests.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Nenhuma solicitação pendente
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {pendingRequests.map((request: any) => (
                                            <div
                                                key={request.user.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={request.user?.avatar_url} />
                                                        <AvatarFallback>
                                                            {request.user?.username?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{request.user?.username}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {request.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleApproveRequest(request.user.id)}
                                                    >
                                                        <UserCheck className="h-4 w-4 mr-1" />
                                                        Aprovar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleRejectRequest(request.user.id)}
                                                    >
                                                        <UserX className="h-4 w-4 mr-1" />
                                                        Rejeitar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        )}

                        {allowsInvite && isAdmin && (
                            <TabsContent value="invites" className="space-y-4">
                                {sentInvites.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Nenhum convite pendente
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {sentInvites.map((invite: any) => (
                                            <div
                                                key={invite.user.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={invite.user?.avatar_url} />
                                                        <AvatarFallback>
                                                            {invite.user?.username?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{invite.user?.username}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {invite.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pendente
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
}
