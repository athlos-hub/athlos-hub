"use client";

import { useState, useEffect } from "react";
import { Feed } from "./feed";
import { ProfileContext } from "./profile-selector";
import { CreatePostDialog } from "./create-post-dialog";
import { SocialHeader } from "./social-header";
import { Post, CreatePostPayload } from "@/types/social";
import { getPublicFeed, getFollowingFeed } from "@/actions/social-feed";
import { getMyOrganizations } from "@/actions/organizations";
import { getMyTeams } from "@/actions/teams";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { createOrganizationPost, createTeamPost } from "@/actions/social-posts";
import { Filter } from "lucide-react";
import { FilterPanel } from "@/components/layout/filter-panel";
import { OrganizationPrivacy } from "@/types/organization";
import { PostVisibility } from "@/types/social";

const feedFilterButtonClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-main text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

interface SocialFeedClientProps {
    initialPosts: Post[];
    hasMore: boolean;
}

export function SocialFeedClient({ initialPosts, hasMore }: SocialFeedClientProps) {
    const { data: session, status: sessionStatus } = useSession();
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [feedType, setFeedType] = useState<"all" | "following">("all");
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [hasMorePosts, setHasMorePosts] = useState(hasMore);
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);
    const [organizations, setOrganizations] = useState<
        Array<{ slug: string; name: string; privacy: OrganizationPrivacy }>
    >([]);
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedProfile, setSelectedProfile] = useState<ProfileContext>({
        type: 'athlete',
        id: session?.user?.id || '',
        name: session?.user?.name || 'Você',
    });

    useEffect(() => {
        async function loadOrganizations() {
            if (session?.user) {
                try {
                    const orgs = await getMyOrganizations();
                    
                    const canPostOrgs = orgs.filter(org => {
                        const role = org.role?.toUpperCase();
                        return role === 'OWNER' || role === 'ADMIN' || role === 'ORGANIZER';
                    });
                    
                    setOrganizations(
                        canPostOrgs.map((org) => ({
                            slug: org.slug,
                            name: org.name,
                            privacy: org.privacy,
                        }))
                    );
                    
                    const myTeams = await getMyTeams();
                    setTeams(myTeams.map(team => ({
                        id: team.id,
                        name: team.name
                    })));
                    
                } catch (error) {
                }
            }
        }
        loadOrganizations();
    }, [session]);

    useEffect(() => {
        if (!session && feedType === "following") {
            setFeedType("all");
        }
    }, [session, feedType]);

    useEffect(() => {
        async function loadFeed() {
            if (feedType === "following" && sessionStatus !== "authenticated") {
                return;
            }
            // "Para você": esperar sessão estabilizar; senão getPublicFeed roda sem token e
            // some posts só de membro (ex.: org privada).
            if (feedType === "all" && sessionStatus === "loading") {
                return;
            }
            setIsLoadingFeed(true);
            try {
                const result =
                    feedType === "following"
                        ? await getFollowingFeed(0, 10)
                        : await getPublicFeed(0, 10);
                setPosts(result.content);
                setHasMorePosts(!result.last);
            } catch (error) {
                toast.error("Erro ao carregar feed");
            } finally {
                setIsLoadingFeed(false);
            }
        }
        loadFeed();
    }, [feedType, sessionStatus, session?.accessToken]);

    const loadMore = async (page: number): Promise<Post[]> => {
        const result = feedType === "following"
            ? await getFollowingFeed(page, 10)
            : await getPublicFeed(page, 10);
        return result.content;
    };
    const handleLike = async (_postId: string) => {
    };

    const selectedOrgPrivacy =
        selectedProfile.type === "organization"
            ? organizations.find((o) => o.slug === selectedProfile.id)?.privacy
            : undefined;
    const isPrivateOrganization =
        selectedOrgPrivacy === OrganizationPrivacy.PRIVATE;

    const handleCreatePost = async (payload: CreatePostPayload) => {
        if (selectedProfile.type === 'organization') {
            const visibility = isPrivateOrganization
                ? PostVisibility.MEMBERS_ONLY
                : payload.visibility;
            await createOrganizationPost(
                selectedProfile.id, 
                payload.content, 
                payload.mediaUrls, 
                payload.metadata,
                payload.type,
                visibility
            );
        } else if (selectedProfile.type === 'team') {
            await createTeamPost(
                selectedProfile.id, 
                payload.content, 
                payload.mediaUrls, 
                payload.metadata,
                payload.type,
                payload.visibility
            );
        } else {
            toast.error("Atletas não podem criar posts manualmente");
            return;
        }
        setShowCreatePost(false);
        window.location.reload();
    };

    const canCreatePost = selectedProfile.type !== 'athlete';

    return (
        <div className="space-y-6">
            <SocialHeader
                selectedProfile={selectedProfile}
                onProfileChange={setSelectedProfile}
                onCreatePost={() => setShowCreatePost(true)}
                currentUser={{
                    id: session?.user?.id || '',
                    name: session?.user?.name || 'Você',
                }}
                organizations={organizations}
                teams={teams}
                canCreatePost={canCreatePost}
            />

            <CreatePostDialog
                open={showCreatePost}
                onOpenChange={setShowCreatePost}
                profileType={selectedProfile.type as 'organization' | 'team'}
                profileId={selectedProfile.id}
                profileName={selectedProfile.name}
                organizationPrivacy={
                    selectedProfile.type === "organization"
                        ? selectedOrgPrivacy
                        : undefined
                }
                onSubmit={handleCreatePost}
            />

            <FilterPanel icon={<Filter className="w-5 h-5 text-gray-600 shrink-0" />}>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        type="button"
                        onClick={() => setFeedType("all")}
                        className={feedFilterButtonClass(feedType === "all")}
                    >
                        Para você
                    </button>
                    <button
                        type="button"
                        disabled={!session}
                        title={
                            !session
                                ? "Entre na conta para ver publicações de quem você segue"
                                : undefined
                        }
                        onClick={() => session && setFeedType("following")}
                        className={`${feedFilterButtonClass(feedType === "following")} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        Seguindo
                    </button>
                    {!session && (
                        <span className="text-xs text-gray-600">
                            O feed &quot;Seguindo&quot; requer login.
                        </span>
                    )}
                </div>
            </FilterPanel>

            <Feed
                initialPosts={posts}
                loadMore={loadMore}
                onLike={handleLike}
                hasMore={hasMorePosts}
                isLoading={isLoadingFeed}
            />
        </div>
    );
}
