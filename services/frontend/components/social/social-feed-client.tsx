"use client";

import { useState, useEffect } from "react";
import { Feed } from "./feed";
import { ProfileContext } from "./profile-selector";
import { CreatePostDialog } from "./create-post-dialog";
import { SocialHeader } from "./social-header";
import { Post, CreatePostPayload } from "@/types/social";
import { getPublicFeed } from "@/actions/social-feed";
import { getMyOrganizations } from "@/actions/organizations";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { createOrganizationPost, createTeamPost } from "@/actions/social-posts";

interface SocialFeedClientProps {
    initialPosts: Post[];
    hasMore: boolean;
}

export function SocialFeedClient({ initialPosts, hasMore }: SocialFeedClientProps) {
    const { data: session } = useSession();
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [organizations, setOrganizations] = useState<Array<{ slug: string; name: string }>>([]);
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
                    
                    setOrganizations(canPostOrgs.map(org => ({
                        slug: org.slug,
                        name: org.name
                    })));
                    
                    // TODO: Buscar equipes do competitions-service
                    // Por enquanto, deixar vazio até implementar rota no backend
                    // const teams = await getMyTeams();
                    
                } catch (error) {
                }
            }
        }
        loadOrganizations();
    }, [session]);

    const loadMore = async (page: number): Promise<Post[]> => {
        const result = await getPublicFeed(page, 10);
        return result.content;
    };
    const handleLike = async (_postId: string) => {
    };

    const handleCreatePost = async (payload: CreatePostPayload) => {
        if (selectedProfile.type === 'organization') {
            await createOrganizationPost(selectedProfile.id, payload.content, payload.mediaUrls, payload.metadata);
        } else if (selectedProfile.type === 'team') {
            await createTeamPost(selectedProfile.id, payload.content, payload.mediaUrls, payload.metadata);
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
                teams={[]} // TODO: Adicionar teams quando implementar
                canCreatePost={canCreatePost}
            />

            <CreatePostDialog
                open={showCreatePost}
                onOpenChange={setShowCreatePost}
                profileType={selectedProfile.type as 'organization' | 'team'}
                profileId={selectedProfile.id}
                onSubmit={handleCreatePost}
            />

            <Feed
                initialPosts={initialPosts}
                loadMore={loadMore}
                onLike={handleLike}
                hasMore={hasMore}
            />
        </div>
    );
}
