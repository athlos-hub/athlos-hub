"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/social/post-card";
import { getOrganizationPosts } from "@/actions/social-posts";
import { Post } from "@/types/social";
import { toast } from "sonner";

interface OrganizationPostsSectionProps {
    organizationSlug: string;
}

export function OrganizationPostsSection({ organizationSlug }: OrganizationPostsSectionProps) {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [socialUnavailable, setSocialUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [totalPosts, setTotalPosts] = useState(0);

    useEffect(() => {
        loadPosts();
    }, [organizationSlug]);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const response = await getOrganizationPosts(organizationSlug, 0, 3);

            if (!response) {
                setSocialUnavailable(true);
                setPosts([]);
                setTotalPosts(0);
                return;
            }
            setSocialUnavailable(false);
            setPosts(response.content);
            setTotalPosts(response.totalElements);
        } catch (error) {
            setSocialUnavailable(false);
            setPosts([]);
            setTotalPosts(0);
            toast.error("Erro ao carregar posts da organização");
        } finally {
            setLoading(false);
        }
    };

    const handleViewAllPosts = () => {
        router.push(`/social/search?organization=${organizationSlug}`);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-main" />
                        Posts da Organização
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-main" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando posts...</p>
                </CardContent>
            </Card>
        );
    }

    if (socialUnavailable) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-main" />
                        Posts da Organização
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    <p>
                        A área social desta organização fica disponível após a aprovação pela
                        plataforma.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!posts || posts.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-main" />
                        Posts da Organização
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Ainda não há posts publicados por esta organização.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-main" />
                    Posts da Organização
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {posts && posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onLike={async () => {}}
                        onComment={async () => {}}
                    />
                ))}

                {totalPosts > 3 && (
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={handleViewAllPosts}
                        >
                            Acompanhar todos os posts
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
