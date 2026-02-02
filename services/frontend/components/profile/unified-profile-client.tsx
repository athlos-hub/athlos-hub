"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AthleteProfile } from "@/actions/athlete-profile";
import { toggleFollow, checkIsFollowing } from "@/actions/follow";
import { Post } from "@/types/social";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Trophy, 
  UserPlus,
  UserMinus,
  Settings,
  Share2,
  Loader2,
  X,
  Check,
  Edit2
} from "lucide-react";
import { PostCard } from "@/components/social/post-card";
import { updateBio } from "@/actions/athlete-profile";
import { EditProfileModal } from "./edit-profile-modal";
import { EditSocialProfileModal } from "./edit-social-profile-modal";
import { FollowListModal } from "./follow-list-modal";
import { getFollowedOrganizations } from "@/actions/organization-follow";

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

export function UnifiedProfileClient({ 
  athleteProfile, 
  initialPosts, 
  totalPosts,
  authUserData,
  isOwnProfile 
}: UnifiedProfileProps) {
  const { data: session } = useSession();
  const [posts] = useState<Post[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<"posts" | "achievements" | "about">("posts");
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

  return (
    <div className="container">
      <Card className="mb-6">
        <CardHeader className="relative pb-0">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-[#00924B] to-main/90 rounded-t-lg flex items-center justify-center">
            <span className="text-white/30 text-4xl font-bold tracking-wider">AthlosHub</span>
          </div>
          
          <div className="relative flex flex-col md:flex-row items-start md:items-end gap-4 pt-20 pb-4">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={getAvatarUrl()} />
              <AvatarFallback className="text-3xl">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{getUserDisplayName()}</h1>
                {athleteProfile.isVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="h-3 w-3" />
                    Verificado
                  </Badge>
                )}
              </div>
              
              {currentAuthData?.username && (
                <p className="text-muted-foreground mb-2">@{currentAuthData.username}</p>
              )}
              
              {(currentProfile.city || currentProfile.state) && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[currentProfile.city, currentProfile.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditSocialModalOpen(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Completar Perfil
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant={isFollowing ? "outline" : "default"}
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
                    {isFollowing ? "Seguindo" : "Seguir"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="mb-4">
            {isOwnProfile && isEditingBio ? (
              <div className="space-y-2">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escreva uma bio..."
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveBio} disabled={isSubmitting} className="bg-main hover:bg-main/90">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
                <p className="text-muted-foreground flex-1">
                  {savedBio || (isOwnProfile ? "Adicione uma bio para que outros atletas possam conhecer você melhor." : "Este atleta ainda não adicionou uma bio.")}
                </p>
                {isOwnProfile && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditingBio(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-6 text-sm border-t pt-4">
            <button className="flex flex-col items-center px-4 py-2 rounded-lg transition-colors">
              <span className="text-2xl font-bold">{totalPosts}</span>
              <span className="text-muted-foreground">Posts</span>
            </button>
            <button
              onClick={() => {
                setFollowListTab("followers");
                setIsFollowListModalOpen(true);
              }}
              className="flex flex-col items-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <span className="text-2xl font-bold">{currentProfile.followersCount}</span>
              <span className="text-muted-foreground">Seguidores</span>
            </button>
            <button
              onClick={() => {
                setFollowListTab("following");
                setIsFollowListModalOpen(true);
              }}
              className="flex flex-col items-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <span className="text-2xl font-bold">{totalFollowing}</span>
              <span className="text-muted-foreground">Seguindo</span>
            </button>
            <button className="flex flex-col items-center px-4 py-2 rounded-lg transition-colors">
              <span className="text-2xl font-bold">{currentProfile.achievementsCount}</span>
              <span className="text-muted-foreground">Conquistas</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "posts"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "achievements"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Conquistas
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "about"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Sobre
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {activeTab === "posts" && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum post ainda.</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2">
                    Compartilhe suas conquistas e experiências!
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
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Conquistas em breve...</p>
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-4">
            {currentProfile.specialization && (
              <div>
                <h4 className="font-medium mb-1">Especialização</h4>
                <p className="text-muted-foreground">{currentProfile.specialization}</p>
              </div>
            )}
            
            {(currentProfile.city || currentProfile.state || currentProfile.country) && (
              <div>
                <h4 className="font-medium mb-1">Localização</h4>
                <p className="text-muted-foreground">
                  {[currentProfile.city, currentProfile.state, currentProfile.country].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            {currentProfile.statistics && Object.keys(currentProfile.statistics).length > 0 && (
              <div>
                <h4 className="font-medium mb-1">Estatísticas</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {Object.entries(currentProfile.statistics).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-muted-foreground">{key}: </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!currentProfile.specialization && !currentProfile.city && !currentProfile.state && !currentProfile.country && 
              (!currentProfile.statistics || Object.keys(currentProfile.statistics).length === 0)) && (
              <p className="text-muted-foreground text-center py-8">
                {isOwnProfile 
                  ? "Complete seu perfil para que outros atletas possam conhecer você melhor."
                  : "Este atleta ainda não completou seu perfil."
                }
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
