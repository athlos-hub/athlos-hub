"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AthleteProfile } from "@/actions/athlete-profile";
import { toggleFollow, checkIsFollowing } from "@/actions/follow";
import { Post } from "@/types/social";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel } from "@/components/layout/filter-panel";
import {
  MapPin,
  Trophy,
  UserPlus,
  UserMinus,
  Settings,
  Loader2,
  X,
  Check,
  Edit2,
  MessageSquare,
  Info,
  Filter,
} from "lucide-react";
import { PostCard } from "@/components/social/post-card";
import { updateBio } from "@/actions/athlete-profile";
import { EditProfileModal } from "./edit-profile-modal";
import { EditSocialProfileModal } from "./edit-social-profile-modal";
import { FollowListModal } from "./follow-list-modal";
import { ShareProfileButton } from "./share-profile-button";
import { getFollowedOrganizations } from "@/actions/organization-follow";
import { getUserShares, Share } from "@/actions/shares";
import { AchievementsSection } from "@/components/achievements/achievements-section";

interface AuthUserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  enabled?: boolean;
  email_verified?: boolean;
}

interface UnifiedProfileProps {
  athleteProfile: AthleteProfile;
  initialPosts: Post[];
  totalPosts: number;
  authUserData?: AuthUserProfile | null;
  isOwnProfile: boolean;
}

type ProfileContentTab = "posts" | "shared" | "achievements" | "about";

const filterButtonClass = (active: boolean) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    active ? "bg-main text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }`;

export function UnifiedProfileClient({ 
  athleteProfile, 
  initialPosts, 
  totalPosts,
  authUserData,
  isOwnProfile 
}: UnifiedProfileProps) {
  const { data: session } = useSession();
  const [posts] = useState<Post[]>(initialPosts);
  const [sharedPosts, setSharedPosts] = useState<Share[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSocialModalOpen, setIsEditSocialModalOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bio, setBio] = useState(athleteProfile.bio || "");
  const [savedBio, setSavedBio] = useState(athleteProfile.bio || "");
  const [currentAuthData, setCurrentAuthData] = useState<AuthUserProfile | null>(authUserData || null);
  const [currentProfile, setCurrentProfile] = useState<AthleteProfile>(athleteProfile);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isFollowListModalOpen, setIsFollowListModalOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<"followers" | "following">("followers");
  const [totalFollowing, setTotalFollowing] = useState(athleteProfile.followingCount);

  useEffect(() => {
    if (!isOwnProfile && session?.user?.keycloakId) {
      checkIsFollowing(athleteProfile.keycloakId).then(setIsFollowing);
    }
  }, [isOwnProfile, athleteProfile.keycloakId, session?.user?.keycloakId]);

  useEffect(() => {
    async function loadFollowingCount() {
      try {
        const orgsData = await getFollowedOrganizations(athleteProfile.keycloakId);
        setTotalFollowing(currentProfile.followingCount + orgsData.totalElements);
      } catch {
        setTotalFollowing(currentProfile.followingCount);
      }
    }
    loadFollowingCount();
  }, [athleteProfile.keycloakId, currentProfile.followingCount]);

  useEffect(() => {
    async function loadSharedPosts() {
      if (activeTab !== "shared") return;
      
      setIsLoadingShares(true);
      try {
        const data = await getUserShares(athleteProfile.keycloakId);
        setSharedPosts(data.content);
      } catch (error) {
      } finally {
        setIsLoadingShares(false);
      }
    }
    loadSharedPosts();
  }, [activeTab, athleteProfile.keycloakId]);

  useEffect(() => {
    if (authUserData) {
      setCurrentAuthData(authUserData);
    }
  }, [authUserData]);

  const getUserDisplayName = () => {
    if (currentAuthData) {
      if (currentAuthData.first_name && currentAuthData.last_name) {
        return `${currentAuthData.first_name} ${currentAuthData.last_name}`;
      }
      if (currentAuthData.first_name) {
        return currentAuthData.first_name;
      }
      if (currentAuthData.username) {
        return currentAuthData.username;
      }
    }
    return "Atleta";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = () => {
    return currentAuthData?.avatar_url || session?.user?.image || undefined;
  };

  const handleProfileUpdated = (newData: AuthUserProfile) => {
    setCurrentAuthData(newData);
  };

  const handleSocialProfileUpdated = (newProfile: AthleteProfile) => {
    setCurrentProfile(newProfile);
  };

  const handleToggleFollow = async () => {
    if (!session?.user) {
      toast.error("Você precisa estar logado para seguir");
      return;
    }

    setIsLoadingFollow(true);
    try {
      const nowFollowing = await toggleFollow(athleteProfile.keycloakId);
      setIsFollowing(nowFollowing);
      
      setCurrentProfile(prev => ({
        ...prev,
        followersCount: nowFollowing ? prev.followersCount + 1 : prev.followersCount - 1
      }));
      
      toast.success(nowFollowing ? "Agora você está seguindo!" : "Deixou de seguir");
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleSaveBio = async () => {
    setIsSubmitting(true);
    try {
      await updateBio(bio);
      setSavedBio(bio);
      setIsEditingBio(false);
      toast.success("Bio atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar bio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const profileActions = isOwnProfile ? (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
        <Settings className="h-4 w-4 mr-2" />
        Editar perfil
      </Button>
      <Button variant="outline" size="sm" onClick={() => setIsEditSocialModalOpen(true)}>
        <Edit2 className="h-4 w-4 mr-2" />
        Dados sociais
      </Button>
      <ShareProfileButton keycloakId={athleteProfile.keycloakId} />
    </>
  ) : (
    <>
      <Button
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        className={
          isFollowing
            ? "border-destructive/40 text-destructive hover:bg-destructive/10"
            : "bg-main text-white hover:bg-main/90"
        }
        onClick={handleToggleFollow}
        disabled={isLoadingFollow}
      >
        {isLoadingFollow ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="h-4 w-4 mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {isFollowing ? "Deixar de seguir" : "Seguir"}
      </Button>
      <ShareProfileButton keycloakId={athleteProfile.keycloakId} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        subtitle="Publicações, conquistas e informações públicas do atleta."
        actions={<div className="flex flex-wrap gap-2">{profileActions}</div>}
      />

      <Card className="overflow-hidden border-border">
        <div className="h-1 w-full bg-linear-to-r from-main/80 via-main to-main/70" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar className="h-20 w-20 shrink-0 rounded-lg border border-border">
                <AvatarImage src={getAvatarUrl()} alt={getUserDisplayName()} />
                <AvatarFallback className="rounded-lg text-xl">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <CardTitle className="text-2xl">{getUserDisplayName()}</CardTitle>
                  {athleteProfile.isVerified && (
                    <Badge variant="outline" className="border-main/30 text-main gap-1">
                      <Trophy className="h-3 w-3" />
                      Verificado
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {currentAuthData?.username && (
                    <span className="block">@{currentAuthData.username}</span>
                  )}
                  {(currentProfile.city || currentProfile.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-main" />
                      <span>{[currentProfile.city, currentProfile.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-0">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            {isOwnProfile && isEditingBio ? (
              <div className="space-y-3">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escreva uma bio..."
                  className="min-h-[100px] bg-background"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveBio}
                    disabled={isSubmitting}
                    className="bg-main hover:bg-main/90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-2">Salvar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingBio(false);
                      setBio(savedBio);
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-2">Cancelar</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                  {savedBio ||
                    (isOwnProfile
                      ? "Adicione uma bio para que outros atletas possam conhecer você melhor."
                      : "Este atleta ainda não adicionou uma bio.")}
                </p>
                {isOwnProfile && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setIsEditingBio(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Resumo
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-3 py-3 text-center">
                <span className="text-2xl font-bold tabular-nums text-foreground">{totalPosts}</span>
                <span className="text-xs text-muted-foreground">Posts</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFollowListTab("followers");
                  setIsFollowListModalOpen(true);
                }}
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-3 py-3 text-center transition-colors hover:bg-muted/60"
              >
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {currentProfile.followersCount}
                </span>
                <span className="text-xs text-muted-foreground">Seguidores</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowListTab("following");
                  setIsFollowListModalOpen(true);
                }}
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-3 py-3 text-center transition-colors hover:bg-muted/60"
              >
                <span className="text-2xl font-bold tabular-nums text-foreground">{totalFollowing}</span>
                <span className="text-xs text-muted-foreground">Seguindo</span>
              </button>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-3 py-3 text-center">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {currentProfile.achievementsCount}
                </span>
                <span className="text-xs text-muted-foreground">Conquistas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentProfile.achievementsCount > 0 && (
        <AchievementsSection
          achievements={currentProfile.achievements}
          achievementsCount={currentProfile.achievementsCount}
          maxDisplay={6}
        />
      )}

      <FilterPanel icon={<Filter className="w-5 h-5 text-gray-600" />}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={filterButtonClass(activeTab === "posts")}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shared")}
            className={filterButtonClass(activeTab === "shared")}
          >
            Compartilhados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("achievements")}
            className={filterButtonClass(activeTab === "achievements")}
          >
            Conquistas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={filterButtonClass(activeTab === "about")}
          >
            Sobre
          </button>
        </div>
      </FilterPanel>

      <div className="space-y-4">
        {activeTab === "posts" && (
          <>
            {posts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
                <p className="font-medium text-foreground">Nenhum post ainda</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2 max-w-sm mx-auto">
                    Compartilhe suas conquistas e experiências na rede.
                  </p>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => {}}
                  onComment={() => {}}
                  onDelete={() => {}}
                />
              ))
            )}
          </>
        )}

        {activeTab === "achievements" && (
          <>
            {currentProfile.achievementsCount === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
                <p className="font-medium text-foreground">Nenhuma conquista ainda</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2 max-w-sm mx-auto">
                    Participe de competições para desbloquear conquistas.
                  </p>
                )}
              </div>
            ) : (
              <AchievementsSection
                achievements={currentProfile.achievements}
                achievementsCount={currentProfile.achievementsCount}
                maxDisplay={999}
              />
            )}
          </>
        )}

        {activeTab === "shared" && (
          <>
            {isLoadingShares ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-main" />
                <p className="text-sm text-muted-foreground mt-2">Carregando compartilhamentos…</p>
              </div>
            ) : sharedPosts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
                <p className="font-medium text-foreground">Nenhum post compartilhado</p>
              </div>
            ) : (
              sharedPosts.map((share) => (
                <div key={share.id} className="space-y-2">
                  {share.comment && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground italic">
                      &ldquo;{share.comment}&rdquo;
                    </div>
                  )}
                  <PostCard
                    post={share.post}
                    isSharedByMe={isOwnProfile}
                    onUnshare={() => {
                      setSharedPosts(sharedPosts.filter((s) => s.id !== share.id));
                    }}
                  />
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "about" && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-6">
            {currentProfile.specialization && (
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-main" />
                  Especialização
                </h4>
                <p className="text-sm text-muted-foreground">{currentProfile.specialization}</p>
              </div>
            )}

            {(currentProfile.city || currentProfile.state || currentProfile.country) && (
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-main" />
                  Localização
                </h4>
                <p className="text-sm text-muted-foreground">
                  {[currentProfile.city, currentProfile.state, currentProfile.country].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            {currentProfile.statistics && Object.keys(currentProfile.statistics).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-main" />
                  Estatísticas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(currentProfile.statistics).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium tabular-nums">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!currentProfile.specialization &&
              !currentProfile.city &&
              !currentProfile.state &&
              !currentProfile.country &&
              (!currentProfile.statistics || Object.keys(currentProfile.statistics).length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isOwnProfile
                    ? "Complete seu perfil para que outros atletas possam conhecer você melhor."
                    : "Este atleta ainda não completou o perfil."}
                </p>
              )}
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentData={currentAuthData}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {isOwnProfile && (
        <EditSocialProfileModal
          isOpen={isEditSocialModalOpen}
          onClose={() => setIsEditSocialModalOpen(false)}
          currentProfile={currentProfile}
          onProfileUpdated={handleSocialProfileUpdated}
        />
      )}

      <FollowListModal
        isOpen={isFollowListModalOpen}
        onClose={() => setIsFollowListModalOpen(false)}
        keycloakId={athleteProfile.keycloakId}
        initialTab={followListTab}
      />
    </div>
  );
}
