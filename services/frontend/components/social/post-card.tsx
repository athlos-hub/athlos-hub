"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react";
import { Post, PostType, ProfileType } from "@/types/social";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getOrganizationBySlug } from "@/actions/organizations";
import { togglePostLike, getPostLikeStatus } from "@/actions/social-likes";
import { useSession } from "next-auth/react";
import { CommentSection } from "./comment-section";

interface PostCardProps {
    post: Post;
    onLike?: () => void;
    onComment?: () => void;
    onDelete?: () => void;
    isLiked?: boolean;
}

interface ProfileInfo {
    name: string;
    logoUrl?: string;
    avatarUrl?: string;
}

export function PostCard({ post, onLike, onComment, onDelete, isLiked = false }: PostCardProps) {
    const { data: session } = useSession();
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);
    const [isLiking, setIsLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
        name: post.profileId,
    });

    useEffect(() => {
        async function fetchProfileInfo() {
            try {
                if (post.profileType === ProfileType.ORGANIZATION) {
                    const org = await getOrganizationBySlug(post.profileId, false);
                    setProfileInfo({
                        name: org.name,
                        logoUrl: org.logo_url || undefined,
                    });
                }
                // TODO: Buscar informações de Team quando implementado
            } catch (error) {
                console.error('Failed to fetch profile info:', error);
            }
        }
        fetchProfileInfo();
    }, [post.profileId, post.profileType]);

    useEffect(() => {
        async function fetchLikeStatus() {
            if (!session?.user) return;
            
            try {
                const status = await getPostLikeStatus(post.id);
                setLiked(status.isLiked ?? false);
                setLikesCount(status.likesCount ?? 0);
            } catch (error) {
                console.error('Failed to fetch like status:', error);
            }
        }
        fetchLikeStatus();
    }, [post.id, session?.user]);

    const handleLike = async () => {
        if (!session?.user) {
            return;
        }

        if (isLiking) return;

        setIsLiking(true);
        const previousLiked = liked;
        const previousCount = likesCount;

        setLiked(!liked);
        setLikesCount(liked ? likesCount - 1 : likesCount + 1);

        try {
            const result = await togglePostLike(post.id);
            setLiked(result.isLiked ?? !previousLiked);
            setLikesCount(result.likesCount ?? (previousLiked ? previousCount - 1 : previousCount + 1));
            onLike?.();
        } catch (error) {
            console.error('Failed to toggle like:', error);
            setLiked(previousLiked);
            setLikesCount(previousCount);
        } finally {
            setIsLiking(false);
        }
    };

    const getProfileBadge = () => {
        switch (post.profileType) {
            case ProfileType.ORGANIZATION:
                return <Badge variant="secondary">Organização</Badge>;
            case ProfileType.TEAM:
                return <Badge variant="outline">Equipe</Badge>;
            case ProfileType.ATHLETE:
                if (post.type === PostType.ACHIEVEMENT) {
                    return <Badge variant="default">🏆 Conquista</Badge>;
                }
                return null;
            default:
                return null;
        }
    };

    const getPostTypeIcon = () => {
        switch (post.type) {
            case PostType.ACHIEVEMENT:
                return "🏆";
            case PostType.ANNOUNCEMENT:
                return "📢";
            case PostType.EVENT:
                return "📅";
            case PostType.TRAINING:
                return "💪";
            default:
                return null;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={profileInfo.logoUrl || profileInfo.avatarUrl} />
                    <AvatarFallback>{profileInfo.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{profileInfo.name}</h3>
                        {getProfileBadge()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </p>
                </div>
                {onDelete && (
                    <Button variant="ghost" size="icon" onClick={onDelete}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {getPostTypeIcon() && (
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{getPostTypeIcon()}</span>
                        <span className="text-sm font-medium text-muted-foreground">
                            {post.type}
                        </span>
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {post.mediaUrls.map((url, index) => (
                            <img
                                key={index}
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="rounded-lg w-full object-cover max-h-64"
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-3 border-t">
                <div className="flex items-center gap-4 w-full">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={handleLike}
                        disabled={isLiking}
                    >
                        <Heart
                            className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : ""}`}
                        />
                        <span className="text-xs">{likesCount}</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">{commentsCount}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>
                
                {showComments && (
                    <div className="w-full">
                        <CommentSection 
                            postId={post.id} 
                            initialCommentsCount={commentsCount}
                            onCommentCountChange={setCommentsCount}
                        />
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
