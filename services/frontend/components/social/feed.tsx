"use client";

import { useState, useEffect } from "react";
import { Post } from "@/types/social";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface FeedProps {
    initialPosts: Post[];
    loadMore: (page: number) => Promise<Post[]>;
    onLike: (postId: string) => Promise<void>;
    onComment?: (postId: string) => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export function Feed({ initialPosts, loadMore, onLike, onComment, hasMore = true, isLoading = false }: FeedProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(hasMore);

    useEffect(() => {
        setPosts(initialPosts);
        setPage(1);
        setHasMorePosts(hasMore);
    }, [initialPosts, hasMore]);

    const handleLoadMore = async () => {
        if (loading || !hasMorePosts) return;

        setLoading(true);
        try {
            const newPosts = await loadMore(page);
            if (newPosts.length === 0) {
                setHasMorePosts(false);
                toast.info("Você chegou ao final do feed");
            } else {
                setPosts([...posts, ...newPosts]);
                setPage(page + 1);
            }
        } catch (error) {
            toast.error("Erro ao carregar mais posts");
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            await onLike(postId);
        } catch (error) {
            toast.error("Erro ao curtir post");
        }
    };

    if (isLoading) {
        return (
            <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-main" />
                <p className="text-sm text-muted-foreground mt-3">Carregando publicações…</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
                <p className="font-medium text-foreground">Nenhuma publicação no feed</p>
                <p className="text-sm mt-2 max-w-sm mx-auto">
                    Quando houver posts da comunidade, eles aparecerão aqui.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleLike(post.id)}
                    onComment={onComment ? () => onComment(post.id) : undefined}
                />
            ))}

            {hasMorePosts && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Carregando...
                            </>
                        ) : (
                            "Carregar mais"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
