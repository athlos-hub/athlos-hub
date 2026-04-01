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
import { getUserPublicInfo } from "@/actions/auth";
import { getFollowedOrganizations, toggleFollowOrganization } from "@/actions/organization-follow";
import { getOrganizationBySlug } from "@/actions/organizations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  keycloakId: string;
  initialTab?: "followers" | "following";
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
        const followersWithUsers = await Promise.all(
          data.content.map(async (follow) => {
            try {
              const userInfo = await getUserPublicInfo(follow.followerKeycloakId);
              return {
                id: follow.id,
                keycloakId: follow.followerKeycloakId,
                userInfo,
              };
            } catch {
              return {
                id: follow.id,
                keycloakId: follow.followerKeycloakId,
                userInfo: null,
              };
            }
          })
        );
        setFollowers(followersWithUsers);
      } else {
        const userData = await getFollowing(keycloakId);
        const followingWithUsers = await Promise.all(
          userData.content.map(async (follow) => {
            try {
              const userInfo = await getUserPublicInfo(follow.followingKeycloakId);
              return {
                id: follow.id,
                keycloakId: follow.followingKeycloakId,
                userInfo,
              };
            } catch {
              return {
                id: follow.id,
                keycloakId: follow.followingKeycloakId,
                userInfo: null,
              };
            }
          })
        );
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
      await toggleFollow(targetKeycloakId);
      await loadData();
      toast.success("Atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setLoadingFollow(null);
    }
  };

  const handleToggleOrganizationFollow = async (orgSlug: string) => {
    setLoadingFollow(orgSlug);
    try {
      await toggleFollowOrganization(orgSlug);
      await loadData();
      toast.success("Atualizado!");
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
            key={user.id}
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
            {renderUserList(following)}
            
            {followingOrgs.length > 0 && (
              <>
                <div className="mt-6 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Organizações</h3>
                </div>
                <div className="space-y-3">
                  {followingOrgs.map((org) => (
                    <div
                      key={org.id}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
