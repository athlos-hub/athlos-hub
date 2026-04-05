"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, UserMinus, Building2 } from "lucide-react";
import { getFollowers, getFollowing, toggleFollow } from "@/actions/follow";
import { getUserPublicInfo, getUsersPublicInfoBatch } from "@/actions/auth";
import { getFollowedOrganizations, toggleFollowOrganization } from "@/actions/organization-follow";
import { getOrganizationBySlug } from "@/actions/organizations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  keycloakId: string;
  initialTab?: "followers" | "following";
  onFollowChange?: (delta: number) => void;
}

interface UserInfo {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface OrgInfo {
  slug: string;
  name: string;
  logo_url: string | null;
}

interface FollowWithUser {
  id: string;
  keycloakId: string;
  userInfo: UserInfo | null;
  isFollowing?: boolean;
}

interface FollowWithOrg {
  id: string;
  organizationSlug: string;
  orgInfo: OrgInfo | null;
  isFollowing?: boolean;
}

export function FollowListModal({
  isOpen,
  onClose,
  keycloakId,
  initialTab = "followers",
  onFollowChange,
}: FollowListModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [followers, setFollowers] = useState<FollowWithUser[]>([]);
  const [following, setFollowing] = useState<FollowWithUser[]>([]);
  const [followingOrgs, setFollowingOrgs] = useState<FollowWithOrg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab, keycloakId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "followers") {
        const data = await getFollowers(keycloakId);
        
        // Buscar todos os usuários de uma vez (batch)
        let usersInfo: Record<string, any> = {};
        if (data.content.length > 0) {
          try {
            const batchUsers = await getUsersPublicInfoBatch(data.content);
            usersInfo = Object.fromEntries(
              batchUsers.map(user => [user.keycloak_id, user])
            );
          } catch (error) {
            console.error("Error loading batch users:", error);
          }
        }
        
        // Buscar lista de "Seguindo" do usuário logado para saber quem você já está seguindo
        let isFollowingMap: Record<string, boolean> = {};
        if (session?.user?.keycloakId) {
          try {
            const myFollowing = await getFollowing(session.user.keycloakId);
            // Converter em mapa para busca rápida
            isFollowingMap = Object.fromEntries(
              myFollowing.content.map(keycloakId => [keycloakId, true])
            );
          } catch (error) {
            console.error("Error loading current user following:", error);
          }
        }
        
        const followersWithUsers = data.content.map((followerKeycloakId: string) => ({
          id: followerKeycloakId,
          keycloakId: followerKeycloakId,
          userInfo: usersInfo[followerKeycloakId] || null,
          isFollowing: isFollowingMap[followerKeycloakId] || false,
        }));
        
        setFollowers(followersWithUsers);
      } else {
        const userData = await getFollowing(keycloakId);
        
        // Buscar todos os usuários de uma vez (batch)
        let usersInfo: Record<string, any> = {};
        if (userData.content.length > 0) {
          try {
            const batchUsers = await getUsersPublicInfoBatch(userData.content);
            usersInfo = Object.fromEntries(
              batchUsers.map(user => [user.keycloak_id, user])
            );
          } catch (error) {
            console.error("Error loading batch users:", error);
          }
        }
        
        const followingWithUsers = userData.content.map((followingKeycloakId: string) => ({
          id: followingKeycloakId,
          keycloakId: followingKeycloakId,
          userInfo: usersInfo[followingKeycloakId] || null,
          isFollowing: true, // Se está na aba "seguindo", já está seguindo
        }));
        
        setFollowing(followingWithUsers);

        try {
          const orgData = await getFollowedOrganizations(keycloakId);
          const followingWithOrgs = await Promise.all(
            orgData.content.map(async (follow) => {
              try {
                const orgInfo = await getOrganizationBySlug(follow.organizationSlug);
                return {
                  id: follow.id,
                  organizationSlug: follow.organizationSlug,
                  orgInfo: {
                    slug: orgInfo.slug,
                    name: orgInfo.name,
                    logo_url: orgInfo.logo_url || null,
                  },
                  isFollowing: true,
                };
              } catch {
                return {
                  id: follow.id,
                  organizationSlug: follow.organizationSlug,
                  orgInfo: null,
                  isFollowing: true,
                };
              }
            })
          );
          setFollowingOrgs(followingWithOrgs);
        } catch {
          setFollowingOrgs([]);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async (targetKeycloakId: string) => {
    setLoadingFollow(targetKeycloakId);
    try {
      const isNowFollowing = await toggleFollow(targetKeycloakId);
      
      // Atualizar localmente o estado dos usuários
      setFollowers(prev => 
        prev.map(user => 
          user.keycloakId === targetKeycloakId 
            ? { ...user, isFollowing: isNowFollowing }
            : user
        )
      );
      
      setFollowing(prev => 
        prev.map(user => 
          user.keycloakId === targetKeycloakId 
            ? { ...user, isFollowing: isNowFollowing }
            : user
        )
      );
      
      // Notificar o componente pai sobre a mudança
      if (onFollowChange) {
        // Atualiza o contador de "Seguindo" do usuário logado
        onFollowChange(isNowFollowing ? 1 : -1);
      }
      
      // Toast descritivo
      if (isNowFollowing) {
        toast.success("Agora você está seguindo este usuário");
      } else {
        toast.success("Deixou de seguir este usuário");
      }
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setLoadingFollow(null);
    }
  };

  const handleToggleOrganizationFollow = async (orgSlug: string) => {
    setLoadingFollow(orgSlug);
    try {
      const isNowFollowing = await toggleFollowOrganization(orgSlug);
      
      // Atualizar localmente o estado das organizações
      setFollowingOrgs(prev => 
        prev.map(org => 
          org.organizationSlug === orgSlug 
            ? { ...org, isFollowing: isNowFollowing }
            : org
        )
      );
      
      // Toast descritivo
      if (isNowFollowing) {
        toast.success("Agora você está seguindo esta organização");
      } else {
        toast.success("Deixou de seguir esta organização");
      }
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setLoadingFollow(null);
    }
  };

  const getUserName = (user: UserInfo | null) => {
    if (!user) return "Usuário";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    return user.username || "Usuário";
  };

  const getUserInitials = (user: UserInfo | null) => {
    const name = getUserName(user);
    return name.substring(0, 2).toUpperCase();
  };

  const renderUserList = (users: FollowWithUser[]) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-main" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum usuário encontrado</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.keycloakId}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Link
              href={`/profile/${user.keycloakId}`}
              className="flex items-center gap-3 flex-1"
              onClick={onClose}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.userInfo?.avatar_url || undefined} />
                <AvatarFallback>{getUserInitials(user.userInfo)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserName(user.userInfo)}</p>
                {user.userInfo?.username && (
                  <p className="text-sm text-muted-foreground">@{user.userInfo.username}</p>
                )}
              </div>
            </Link>
            {session?.user?.keycloakId !== user.keycloakId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleFollow(user.keycloakId)}
                disabled={loadingFollow === user.keycloakId}
              >
                {loadingFollow === user.keycloakId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Seguindo
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Seguir
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conexões</DialogTitle>
          <DialogDescription>
            Veja quem segue e quem é seguido
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">Seguidores</TabsTrigger>
            <TabsTrigger value="following">Seguindo</TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            {renderUserList(followers)}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-main" />
              </div>
            ) : following.length === 0 && followingOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum perfil sendo seguido</p>
              </div>
            ) : (
              <>
                {following.length > 0 && (
                  <>
                    {following.length > 0 && <div className="mt-6 mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">Usuários</h3>
                    </div>}
                    <div className="space-y-3">
                      {following.map((user) => (
                        <div
                          key={user.keycloakId}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Link
                            href={`/profile/${user.keycloakId}`}
                            className="flex items-center gap-3 flex-1"
                            onClick={onClose}
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.userInfo?.avatar_url || undefined} />
                              <AvatarFallback>{getUserInitials(user.userInfo)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{getUserName(user.userInfo)}</p>
                              {user.userInfo?.username && (
                                <p className="text-sm text-muted-foreground">@{user.userInfo.username}</p>
                              )}
                            </div>
                          </Link>
                          {session?.user?.keycloakId !== user.keycloakId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleFollow(user.keycloakId)}
                              disabled={loadingFollow === user.keycloakId}
                            >
                              {loadingFollow === user.keycloakId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.isFollowing ? (
                                <>
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Seguindo
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Seguir
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {followingOrgs.length > 0 && (
                  <>
                    {following.length > 0 && <div className="mt-6 mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">Organizações</h3>
                    </div>}
                    <div className="space-y-3">
                      {followingOrgs.map((org) => (
                        <div
                          key={org.organizationSlug}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Link
                            href={`/organizations/${org.organizationSlug}`}
                            className="flex items-center gap-3 flex-1"
                            onClick={onClose}
                          >
                            <Avatar className="h-12 w-12 rounded-lg">
                              <AvatarImage src={org.orgInfo?.logo_url || undefined} />
                              <AvatarFallback>
                                <Building2 className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{org.orgInfo?.name || org.organizationSlug}</p>
                              <p className="text-sm text-muted-foreground">Organização</p>
                            </div>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleOrganizationFollow(org.organizationSlug)}
                            disabled={loadingFollow === org.organizationSlug}
                          >
                            {loadingFollow === org.organizationSlug ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="h-4 w-4 mr-2" />
                                Seguindo
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
