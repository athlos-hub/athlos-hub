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
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
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

    const handleLike = async () => {
        setLiked(!liked);
        setLikesCount(liked ? likesCount - 1 : likesCount + 1);
        onLike?.();
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

            <CardFooter className="flex items-center gap-4 pt-3 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={handleLike}
                >
                    <Heart
                        className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
                    />
                    <span className="text-xs">{likesCount}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={onComment}>
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">{post.commentsCount}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
