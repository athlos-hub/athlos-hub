"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MessageCircle, MoreVertical, Link2, Trash2, Flag, Repeat2 } from "lucide-react";
import { Post, PostType, ProfileType, PostVisibility } from "@/types/social";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getOrganizationBySlug } from "@/actions/organizations";
import { togglePostLike, getPostLikeStatus } from "@/actions/social-likes";
import { checkHasShared, unsharePost } from "@/actions/shares";
import { useSession } from "next-auth/react";
import { CommentSection } from "./comment-section";
import { ShareButton } from "./share-button";
import { generatePostLink } from "@/lib/utils/share-links";
import { toast } from "sonner";
import { AchievementBadge, Achievement } from "@/components/achievements/achievement-badge";

interface PostCardProps {
    post: Post;
    onLike?: () => void;
    onComment?: () => void;
    onDelete?: () => void;
    onUnshare?: () => void;
    isLiked?: boolean;
    isSharedByMe?: boolean;
}

interface ProfileInfo {
    name: string;
    logoUrl?: string;
    avatarUrl?: string;
}

export function PostCard({ post, onLike, onComment, onDelete, onUnshare, isLiked = false, isSharedByMe = false }: PostCardProps) {
    const { data: session } = useSession();
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);
    const [sharesCount, setSharesCount] = useState(post.sharesCount ?? 0);
    const [hasShared, setHasShared] = useState(isSharedByMe);
    const [isLiking, setIsLiking] = useState(false);
    const [isUnsharing, setIsUnsharing] = useState(false);
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
                } else if (post.profileType === ProfileType.TEAM) {
                    const { getTeamById } = await import("@/actions/teams");
                    const team = await getTeamById(post.profileId);
                    if (team) {
                        setProfileInfo({
                            name: team.name,
                        });
                    }
                }
            } catch (error) {
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
            }
        }
        fetchLikeStatus();
    }, [post.id, session?.user]);

    useEffect(() => {
        async function fetchShareStatus() {
            if (!session?.user) return;
            
            try {
                const shared = await checkHasShared(post.id);
                setHasShared(shared);
            } catch (error) {
            }
        }
        fetchShareStatus();
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
            setLiked(previousLiked);
            setLikesCount(previousCount);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShareComplete = () => {
        setSharesCount(sharesCount + 1);
        setHasShared(true);
    };

    const handleUnshareComplete = () => {
        setSharesCount(Math.max(0, sharesCount - 1));
        setHasShared(false);
        onUnshare?.();
    };

    const handleUnshare = async () => {
        if (isUnsharing) return;
        
        setIsUnsharing(true);
        try {
            await unsharePost(post.id);
            setSharesCount(Math.max(0, sharesCount - 1));
            setHasShared(false);
            toast.success("Compartilhamento removido!");
            onUnshare?.();
        } catch (error) {
            toast.error("Erro ao remover compartilhamento");
        } finally {
            setIsUnsharing(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(generatePostLink(post.id));
            toast.success("Link copiado!");
        } catch {
            toast.error("Erro ao copiar link");
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
                <Link 
                    href={
                        post.profileType === ProfileType.ATHLETE 
                            ? `/profile/${post.profileId}` 
                            : post.profileType === ProfileType.ORGANIZATION
                            ? `/organizations/${post.profileId}`
                            : `/clubes/${post.profileId}`
                    }
                    className="shrink-0"
                >
                    <Avatar className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={profileInfo.logoUrl || profileInfo.avatarUrl} />
                        <AvatarFallback>{profileInfo.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link 
                            href={
                                post.profileType === ProfileType.ATHLETE 
                                    ? `/profile/${post.profileId}` 
                                    : post.profileType === ProfileType.ORGANIZATION
                                    ? `/organizations/${post.profileId}`
                                    : `/teams/${post.profileId}`
                            }
                            className="hover:underline"
                        >
                            <h3 className="font-semibold text-sm">{profileInfo.name}</h3>
                        </Link>
                        {getProfileBadge()}

                        {/* Badge do tipo de post */}
                        {post.type !== PostType.TEXT && (
                            <Badge variant="secondary" className="text-xs">
                                {post.type === PostType.ANNOUNCEMENT && "📢 Anúncio"}
                                {post.type === PostType.EVENT && "📅 Evento"}
                                {post.type === PostType.TRAINING && "💪 Treino"}
                                {post.type === PostType.IMAGE && "🖼️ Imagem"}
                                {post.type === PostType.ACHIEVEMENT && "🏆 Conquista"}
                            </Badge>
                        )}
                        
                        {post.visibility !== PostVisibility.PUBLIC && (
                            <Badge variant="outline" className="text-xs">
                                {post.visibility === PostVisibility.FOLLOWERS && "👥 Seguidores"}
                                {post.visibility === PostVisibility.MEMBERS_ONLY && "🔒 Membros"}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                            <Link2 className="h-4 w-4" />
                            Copiar link
                        </DropdownMenuItem>
                        {hasShared && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={handleUnshare} 
                                    className="gap-2 cursor-pointer text-red-600"
                                    disabled={isUnsharing}
                                >
                                    <Repeat2 className="h-4 w-4" />
                                    Remover compartilhamento
                                </DropdownMenuItem>
                            </>
                        )}
                        {onDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={onDelete} 
                                    className="gap-2 cursor-pointer text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir post
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Renderização especial para conquistas */}
                {post.type === PostType.ACHIEVEMENT && post.metadata && (
                    <div className="mb-4">
                        <AchievementBadge
                            achievement={{
                                achievementType: post.metadata.achievementType || "ACHIEVEMENT",
                                displayName: post.metadata.displayName || "Conquista",
                                description: post.metadata.description || "",
                                competitionName: post.metadata.competitionName,
                                competitionId: post.metadata.competitionId,
                                metadata: post.metadata
                            }}
                            size="lg"
                            showDetails
                        />
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
                    <ShareButton
                        postId={post.id}
                        sharesCount={sharesCount}
                        hasShared={hasShared}
                        onShare={handleShareComplete}
                        onUnshare={handleUnshareComplete}
                    />
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
