"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, UserCheck, UserX, Clock, MoreVertical, Trash2, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteMemberDialog } from "./invite-member-dialog";
import { 
    getOrganizationMembers, 
    getPendingRequests, 
    getSentInvites, 
    approveJoinRequest, 
    rejectJoinRequest, 
    getOrganizationOrganizers,
    removeMember,
    addOrganizer,
    removeOrganizer
} from "@/actions/organizations";
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
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        type: "remove" | "demote" | null;
        userId: string;
        username: string;
    }>({
        open: false,
        type: null,
        userId: "",
        username: "",
    });
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

    const handleRemoveMember = async (userId: string, username: string) => {
        setConfirmDialog({
            open: true,
            type: "remove",
            userId,
            username,
        });
    };

    const handlePromoteToOrganizer = async (userId: string, username: string) => {
        try {
            const result = await addOrganizer(organization.slug, userId);
            if (result.success) {
                toast.success(`${username} foi promovido a organizador`);
                loadData();
            } else {
                toast.error(result.error || "Erro ao promover membro");
            }
        } catch (error) {
            toast.error("Erro ao promover membro");
        }
    };

    const handleDemoteOrganizer = async (userId: string, username: string) => {
        setConfirmDialog({
            open: true,
            type: "demote",
            userId,
            username,
        });
    };

    const confirmAction = async () => {
        const { type, userId, username } = confirmDialog;

        if (type === "remove") {
            try {
                const result = await removeMember(organization.slug, userId);
                if (result.success) {
                    toast.success("Membro removido com sucesso");
                    loadData();
                } else {
                    toast.error(result.error || "Erro ao remover membro");
                }
            } catch (error) {
                toast.error("Erro ao remover membro");
            }
        } else if (type === "demote") {
            try {
                const result = await removeOrganizer(organization.slug, userId);
                if (result.success) {
                    toast.success(`${username} foi rebaixado a membro comum`);
                    loadData();
                } else {
                    toast.error(result.error || "Erro ao rebaixar organizador");
                }
            } catch (error) {
                toast.error("Erro ao rebaixar organizador");
            }
        }

        setConfirmDialog({ open: false, type: null, userId: "", username: "" });
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
                                                    
                                                    {/* Menu de Ações - Apenas para admins e não para o próprio owner */}
                                                    {isAdmin && !member.is_owner && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                
                                                                {organizers.has(member.user?.id) ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDemoteOrganizer(member.user.id, member.user.username)}
                                                                        className="text-yellow-600"
                                                                    >
                                                                        <ShieldOff className="h-4 w-4 mr-2" />
                                                                        Remover Organizador
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handlePromoteToOrganizer(member.user.id, member.user.username)}
                                                                    >
                                                                        <Shield className="h-4 w-4 mr-2" />
                                                                        Promover a Organizador
                                                                    </DropdownMenuItem>
                                                                )}
                                                                
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleRemoveMember(member.user.id, member.user.username)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Remover Membro
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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

            {/* AlertDialog de Confirmação */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: null, userId: "", username: "" })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmDialog.type === "remove" && "Remover Membro"}
                            {confirmDialog.type === "demote" && "Remover Organizador"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.type === "remove" && (
                                <>
                                    Tem certeza que deseja remover <strong>{confirmDialog.username}</strong> da organização?
                                    Esta ação não pode ser desfeita.
                                </>
                            )}
                            {confirmDialog.type === "demote" && (
                                <>
                                    Tem certeza que deseja remover <strong>{confirmDialog.username}</strong> do cargo de organizador?
                                    O usuário continuará como membro comum da organização.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            className={confirmDialog.type === "remove" ? "bg-destructive hover:bg-destructive/90" : ""}
                        >
                            {confirmDialog.type === "remove" && "Remover"}
                            {confirmDialog.type === "demote" && "Remover Organizador"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
