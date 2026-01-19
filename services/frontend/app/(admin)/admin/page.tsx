"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Shield, Users, Building2, Search, Check, X, Ban, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { UserAdmin } from "@/types/user";
import { OrganizationResponse, OrganizationStatus } from "@/types/organization";
import { Pagination } from "@/components/admin/pagination";
import {
    getAllUsers,
    suspendUser,
    unsuspendUser,
    getAllOrganizations,
    acceptOrganization,
    rejectOrganization,
    suspendOrganization,
    unsuspendOrganization,
} from "@/actions/admin";

type TabType = "users" | "suspended-users" | "organizations" | "pending-orgs" | "suspended-orgs";

const ITEMS_PER_PAGE = 10;

const isAdminUser = (u: UserAdmin) => {
    const anyU = u as any;
    if (!anyU) return false;
    if (typeof anyU.is_admin === 'boolean') return anyU.is_admin;
    if (Array.isArray(anyU.roles) && (anyU.roles.includes('admin') || anyU.roles.includes('ADMIN'))) return true;
    if (typeof anyU.is_admin === 'boolean') return anyU.is_admin;
    if (typeof anyU.isAdmin === 'boolean') return anyU.isAdmin;
    if (typeof anyU.admin === 'boolean') return anyU.admin;
    if (typeof anyU.role === 'string' && anyU.role.toLowerCase() === 'admin') return true;
    return false;
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>("users");
    const [users, setUsers] = useState<UserAdmin[]>([]);
    const [suspendedUsers, setSuspendedUsers] = useState<UserAdmin[]>([]);
    const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
    const [pendingOrgs, setPendingOrgs] = useState<OrganizationResponse[]>([]);
    const [suspendedOrgs, setSuspendedOrgs] = useState<OrganizationResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [searchUsers, setSearchUsers] = useState("");
    const [searchSuspendedUsers, setSearchSuspendedUsers] = useState("");
    const [searchOrganizations, setSearchOrganizations] = useState("");
    const [searchPendingOrgs, setSearchPendingOrgs] = useState("");
    const [searchSuspendedOrgs, setSearchSuspendedOrgs] = useState("");
    
    const [currentPageUsers, setCurrentPageUsers] = useState(1);
    const [currentPageSuspendedUsers, setCurrentPageSuspendedUsers] = useState(1);
    const [currentPageOrganizations, setCurrentPageOrganizations] = useState(1);
    const [currentPagePendingOrgs, setCurrentPagePendingOrgs] = useState(1);
    const [currentPageSuspendedOrgs, setCurrentPageSuspendedOrgs] = useState(1);
    
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        type: "suspend-user" | "unsuspend-user" | "accept-org" | "reject-org" | "suspend-org" | "unsuspend-org" | null;
        id: string;
        name: string;
    }>({
        open: false,
        type: null,
        id: "",
        name: "",
    });

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (tab?: TabType) => {
        setIsLoading(true);
        try {
            if (!tab) {
                const [usersData, orgsActive, orgsPending, orgsSuspended] = await Promise.all([
                    getAllUsers(),
                    getAllOrganizations(OrganizationStatus.ACTIVE),
                    getAllOrganizations(OrganizationStatus.PENDING),
                    getAllOrganizations(OrganizationStatus.SUSPENDED),
                ]);

                const activeUsers = usersData.filter(u => u.enabled);
                activeUsers.sort((a, b) => {
                    const aAdmin = isAdminUser(a) ? 0 : 1;
                    const bAdmin = isAdminUser(b) ? 0 : 1;
                    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
                    return (a.username || "").localeCompare(b.username || "");
                });

                const suspendedUsersData = usersData.filter(u => !u.enabled && !isAdminUser(u));

                setUsers(activeUsers);
                setSuspendedUsers(suspendedUsersData);
                setOrganizations(orgsActive);
                setPendingOrgs(orgsPending);
                setSuspendedOrgs(orgsSuspended);
                return;
            }

            if (tab === "users") {
                const usersData = await getAllUsers();
                const activeUsers = usersData.filter(u => u.enabled);
                activeUsers.sort((a, b) => {
                    const aAdmin = isAdminUser(a) ? 0 : 1;
                    const bAdmin = isAdminUser(b) ? 0 : 1;
                    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
                    return (a.username || "").localeCompare(b.username || "");
                });
                setUsers(activeUsers);
            } else if (tab === "suspended-users") {
                const usersData = await getAllUsers();
                setSuspendedUsers(usersData.filter(u => !u.enabled && !isAdminUser(u)));
            } else if (tab === "organizations") {
                const orgs = await getAllOrganizations(OrganizationStatus.ACTIVE);
                setOrganizations(orgs);
            } else if (tab === "pending-orgs") {
                const orgs = await getAllOrganizations(OrganizationStatus.PENDING);
                setPendingOrgs(orgs);
            } else if (tab === "suspended-orgs") {
                const orgs = await getAllOrganizations(OrganizationStatus.SUSPENDED);
                setSuspendedOrgs(orgs);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao carregar dados";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspendUser = (userId: string, username: string) => {
        setConfirmDialog({
            open: true,
            type: "suspend-user",
            id: userId,
            name: username,
        });
    };

    const handleUnsuspendUser = (userId: string, username: string) => {
        setConfirmDialog({
            open: true,
            type: "unsuspend-user",
            id: userId,
            name: username,
        });
    };

    const handleAcceptOrg = (slug: string, name: string) => {
        setConfirmDialog({
            open: true,
            type: "accept-org",
            id: slug,
            name,
        });
    };

    const handleRejectOrg = (slug: string, name: string) => {
        setConfirmDialog({
            open: true,
            type: "reject-org",
            id: slug,
            name,
        });
    };

    const handleSuspendOrg = (slug: string, name: string) => {
        setConfirmDialog({
            open: true,
            type: "suspend-org",
            id: slug,
            name,
        });
    };

    const handleUnsuspendOrg = (slug: string, name: string) => {
        setConfirmDialog({
            open: true,
            type: "unsuspend-org",
            id: slug,
            name,
        });
    };

    const confirmAction = async () => {
        const { type, id, name } = confirmDialog;
        setActioningId(id);

        try {
            switch (type) {
                case "suspend-user":
                    await suspendUser(id);
                    toast.success(`Usuário ${name} suspenso`);
                    break;
                case "unsuspend-user":
                    await unsuspendUser(id);
                    toast.success(`Usuário ${name} reativado`);
                    break;
                case "accept-org":
                    await acceptOrganization(id);
                    toast.success(`Organização ${name} aprovada`);
                    break;
                case "reject-org":
                    await rejectOrganization(id);
                    toast.success(`Organização ${name} rejeitada`);
                    break;
                case "suspend-org":
                    await suspendOrganization(id);
                    toast.success(`Organização ${name} suspensa`);
                    break;
                case "unsuspend-org":
                    await unsuspendOrganization(id);
                    toast.success(`Organização ${name} reativada`);
                    break;
            }
            await fetchData(activeTab);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao executar ação";
            toast.error(message);
        } finally {
            setActioningId(null);
            setConfirmDialog({ open: false, type: null, id: "", name: "" });
        }
    };

    const filteredUsers = users.filter((user) =>
        user.username?.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchUsers.toLowerCase())
    );

    const filteredSuspendedUsers = suspendedUsers.filter((user) =>
        user.username?.toLowerCase().includes(searchSuspendedUsers.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchSuspendedUsers.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchSuspendedUsers.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchSuspendedUsers.toLowerCase())
    );

    const filteredOrganizations = organizations.filter((org) =>
        org.name?.toLowerCase().includes(searchOrganizations.toLowerCase()) ||
        org.slug?.toLowerCase().includes(searchOrganizations.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchOrganizations.toLowerCase())
    );

    const filteredPendingOrgs = pendingOrgs.filter((org) =>
        org.name?.toLowerCase().includes(searchPendingOrgs.toLowerCase()) ||
        org.slug?.toLowerCase().includes(searchPendingOrgs.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchPendingOrgs.toLowerCase())
    );

    const filteredSuspendedOrgs = suspendedOrgs.filter((org) =>
        org.name?.toLowerCase().includes(searchSuspendedOrgs.toLowerCase()) ||
        org.slug?.toLowerCase().includes(searchSuspendedOrgs.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchSuspendedOrgs.toLowerCase())
    );

    const paginateUsers = filteredUsers.slice(
        (currentPageUsers - 1) * ITEMS_PER_PAGE,
        currentPageUsers * ITEMS_PER_PAGE
    );

    const paginateSuspendedUsers = filteredSuspendedUsers.slice(
        (currentPageSuspendedUsers - 1) * ITEMS_PER_PAGE,
        currentPageSuspendedUsers * ITEMS_PER_PAGE
    );

    const paginateOrganizations = filteredOrganizations.slice(
        (currentPageOrganizations - 1) * ITEMS_PER_PAGE,
        currentPageOrganizations * ITEMS_PER_PAGE
    );

    const paginatePendingOrgs = filteredPendingOrgs.slice(
        (currentPagePendingOrgs - 1) * ITEMS_PER_PAGE,
        currentPagePendingOrgs * ITEMS_PER_PAGE
    );

    const paginateSuspendedOrgs = filteredSuspendedOrgs.slice(
        (currentPageSuspendedOrgs - 1) * ITEMS_PER_PAGE,
        currentPageSuspendedOrgs * ITEMS_PER_PAGE
    );

    const totalPagesUsers = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const totalPagesSuspendedUsers = Math.ceil(filteredSuspendedUsers.length / ITEMS_PER_PAGE);
    const totalPagesOrganizations = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE);
    const totalPagesPendingOrgs = Math.ceil(filteredPendingOrgs.length / ITEMS_PER_PAGE);
    const totalPagesSuspendedOrgs = Math.ceil(filteredSuspendedOrgs.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Painel Administrativo
                    </h1>
                    <p className="text-gray-600">Gerencie usuários e organizações da plataforma</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'users' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Usuários ({users.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('suspended-users')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'suspended-users' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Usuários Suspensos ({suspendedUsers.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('organizations')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'organizations' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Organizações Ativas ({organizations.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('pending-orgs')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'pending-orgs' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Organizações Pendentes ({pendingOrgs.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('suspended-orgs')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'suspended-orgs' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Organizações Suspensas ({suspendedOrgs.length})
                            </button>
                        </div>
                    </div>
                </div>

                <TabsContent value="users" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Usuários da Plataforma</CardTitle>
                            <CardDescription className="text-md">Gerencie todos os usuários cadastrados</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por nome, username ou email..."
                                    value={searchUsers}
                                    onChange={(e) => {
                                        setSearchUsers(e.target.value);
                                        setCurrentPageUsers(1);
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhum usuário encontrado
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Criado em</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginateUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={user.avatar_url || ""} />
                                                            <AvatarFallback>
                                                                {user.username?.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex items-center gap-2">
                                                            <div >
                                                                <p className="font-medium">{user.username}</p>
                                                                {user.first_name && (
                                                                    <p className="text-sm text-gray-500">
                                                                        {user.first_name} {user.last_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {isAdminUser(user) && (
                                                                <Badge className="ml-2 self-center" variant="outline">Administrador</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {user.enabled ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                                                Ativo
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                                                Suspenso
                                                            </Badge>
                                                        )}
                                                        {user.email_verified && (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                                                ✓ Verificado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {user.enabled && !isAdminUser(user) && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleSuspendUser(user.id, user.username)}
                                                            disabled={actioningId === user.id}
                                                        >
                                                            {actioningId === user.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Ban className="w-4 h-4 mr-2" />
                                                                    Suspender
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                    {isAdminUser(user) && (
                                                        <div className="text-sm text-gray-500 flex items-center justify-end">Conta administrativa</div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                <Pagination
                                    currentPage={currentPageUsers}
                                    totalPages={totalPagesUsers}
                                    totalItems={filteredUsers.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setCurrentPageUsers}
                                    itemName="usuários"
                                />
                            </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suspended-users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usuários Suspensos</CardTitle>
                            <CardDescription>Usuários que foram suspensos por administradores</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por nome, username ou email..."
                                    value={searchSuspendedUsers}
                                    onChange={(e) => {
                                        setSearchSuspendedUsers(e.target.value);
                                        setCurrentPageSuspendedUsers(1);
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : filteredSuspendedUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum usuário suspenso encontrado
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Usuário</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Data de Criação</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginateSuspendedUsers.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={user.avatar_url || undefined} />
                                                                <AvatarFallback>
                                                                    {user.username.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">{user.username}</div>
                                                                {(user.first_name || user.last_name) && (
                                                                    <div className="text-sm text-gray-500">
                                                                        {user.first_name} {user.last_name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            className="bg-main hover:bg-main/90 text-white"
                                                            onClick={() => handleUnsuspendUser(user.id, user.username)}
                                                            disabled={!!actioningId}
                                                        >
                                                            {actioningId === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4 mr-1" />
                                                            )}
                                                            Reativar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <Pagination
                                        currentPage={currentPageSuspendedUsers}
                                        totalPages={totalPagesSuspendedUsers}
                                        totalItems={filteredSuspendedUsers.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={setCurrentPageSuspendedUsers}
                                        itemName="usuários suspensos"
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="organizations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizações Ativas</CardTitle>
                            <CardDescription>Todas as organizações aceitas na plataforma</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por nome, slug ou descrição..."
                                    value={searchOrganizations}
                                    onChange={(e) => {
                                        setSearchOrganizations(e.target.value);
                                        setCurrentPageOrganizations(1);
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : filteredOrganizations.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhuma organização ativa encontrada
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {paginateOrganizations.map((org) => (
                                            <Card key={org.slug} className="overflow-hidden">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-4">
                                                            <Avatar className="h-16 w-16">
                                                                <AvatarImage src={org.logo_url || undefined} />
                                                                <AvatarFallback>
                                                                    {org.name.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <h3 className="font-semibold text-lg">{org.name}</h3>
                                                                <p className="text-sm text-gray-500">@{org.slug}</p>
                                                                {org.description && (
                                                                    <p className="text-sm text-gray-600 mt-2">
                                                                        {org.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                                    <span>
                                                                        Criada em{" "}
                                                                        {new Date(org.created_at).toLocaleDateString("pt-BR")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleSuspendOrg(org.slug, org.name)}
                                                            disabled={!!actioningId}
                                                        >
                                                            {actioningId === org.slug ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Ban className="h-4 w-4 mr-1" />
                                                            )}
                                                            Suspender
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <Pagination
                                        currentPage={currentPageOrganizations}
                                        totalPages={totalPagesOrganizations}
                                        totalItems={filteredOrganizations.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={setCurrentPageOrganizations}
                                        itemName="organizações"
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending-orgs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizações Aguardando Aprovação</CardTitle>
                            <CardDescription>Aprove ou rejeite organizações pendentes</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por nome, slug ou descrição..."
                                    value={searchPendingOrgs}
                                    onChange={(e) => {
                                        setSearchPendingOrgs(e.target.value);
                                        setCurrentPagePendingOrgs(1);
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : filteredPendingOrgs.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhuma organização pendente encontrada
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {paginatePendingOrgs.map((org) => (
                                            <div key={org.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarImage src={org.logo_url || ""} />
                                                            <AvatarFallback>
                                                                <Building2 className="w-6 h-6" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg">{org.name}</h3>
                                                            <p className="text-sm text-gray-600">{org.description}</p>
                                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                                <span>Criada em {new Date(org.created_at).toLocaleDateString("pt-BR")}</span>
                                                                <Badge variant="outline">{org.privacy}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleAcceptOrg(org.slug, org.name)}
                                                            disabled={actioningId === org.slug}
                                                        >
                                                            {actioningId === org.slug ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Check className="w-4 h-4 mr-2" />
                                                                    Aprovar
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleRejectOrg(org.slug, org.name)}
                                                            disabled={actioningId === org.slug}
                                                        >
                                                            <X className="w-4 h-4 mr-2" />
                                                            Rejeitar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Pagination
                                        currentPage={currentPagePendingOrgs}
                                        totalPages={totalPagesPendingOrgs}
                                        totalItems={filteredPendingOrgs.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={setCurrentPagePendingOrgs}
                                        itemName="organizações pendentes"
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suspended-orgs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizações Suspensas</CardTitle>
                            <CardDescription>Organizações que foram suspensas por violação de políticas</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por nome, slug ou descrição..."
                                    value={searchSuspendedOrgs}
                                    onChange={(e) => {
                                        setSearchSuspendedOrgs(e.target.value);
                                        setCurrentPageSuspendedOrgs(1);
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : filteredSuspendedOrgs.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhuma organização suspensa encontrada
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {paginateSuspendedOrgs.map((org) => (
                                            <div key={org.id} className="border rounded-lg p-4 bg-red-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarImage src={org.logo_url || ""} />
                                                            <AvatarFallback>
                                                                <Building2 className="w-6 h-6" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg">{org.name}</h3>
                                                            <p className="text-sm text-gray-600">{org.description}</p>
                                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                                <span>Suspensa em {new Date(org.updated_at).toLocaleDateString("pt-BR")}</span>
                                                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                                                    Suspensa
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="bg-main hover:bg-main/90 text-white"
                                                        onClick={() => handleUnsuspendOrg(org.slug, org.name)}
                                                        disabled={!!actioningId}
                                                    >
                                                        {actioningId === org.slug ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4 mr-1" />
                                                        )}
                                                        Reativar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Pagination
                                        currentPage={currentPageSuspendedOrgs}
                                        totalPages={totalPagesSuspendedOrgs}
                                        totalItems={filteredSuspendedOrgs.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={setCurrentPageSuspendedOrgs}
                                        itemName="organizações suspensas"
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmDialog.type === "suspend-user" && "Suspender Usuário"}
                            {confirmDialog.type === "unsuspend-user" && "Reativar Usuário"}
                            {confirmDialog.type === "accept-org" && "Aprovar Organização"}
                            {confirmDialog.type === "reject-org" && "Rejeitar Organização"}
                            {confirmDialog.type === "suspend-org" && "Suspender Organização"}
                            {confirmDialog.type === "unsuspend-org" && "Reativar Organização"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.type === "suspend-user" &&
                                `Tem certeza que deseja suspender o usuário "${confirmDialog.name}"? O usuário não poderá mais acessar a plataforma.`}
                            {confirmDialog.type === "unsuspend-user" &&
                                `Tem certeza que deseja reativar o usuário "${confirmDialog.name}"? O usuário poderá acessar a plataforma novamente.`}
                            {confirmDialog.type === "accept-org" &&
                                `Tem certeza que deseja aprovar a organização "${confirmDialog.name}"? Ela ficará visível publicamente.`}
                            {confirmDialog.type === "reject-org" &&
                                `Tem certeza que deseja rejeitar a organização "${confirmDialog.name}"? Esta ação não pode ser desfeita.`}
                            {confirmDialog.type === "suspend-org" &&
                                `Tem certeza que deseja suspender a organização "${confirmDialog.name}"? Ela será ocultada da plataforma.`}
                            {confirmDialog.type === "unsuspend-org" &&
                                `Tem certeza que deseja reativar a organização "${confirmDialog.name}"? Ela ficará visível na plataforma novamente.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            className={
                                confirmDialog.type === "accept-org"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : confirmDialog.type === "unsuspend-org" || confirmDialog.type === "unsuspend-user"
                                    ? "bg-main hover:bg-main/90"
                                    : "bg-destructive hover:bg-destructive/90"
                            }
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
