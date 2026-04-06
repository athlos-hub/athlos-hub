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
import { Heart, MessageCircle, MoreVertical, Link2, Trash2, Flag, Repeat2, Trophy } from "lucide-react";
import { Post, PostType, ProfileType, PostVisibility } from "@/types/social";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseBackendIsoToDate } from "@/lib/datetime/parse-backend-iso";
import { getOrganizationBySlug } from "@/actions/organizations";
import { togglePostLike, getPostLikeStatus } from "@/actions/social-likes";
import { checkHasShared, unsharePost } from "@/actions/shares";
import { useSession } from "next-auth/react";
import { CommentSection } from "./comment-section";
import { ShareButton } from "./share-button";
import { generatePostLink } from "@/lib/utils/share-links";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TeamLogo } from "../teams/team-logo";

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
    /** TEAM: preferir em links /clubes/[id] */
    clubPathId?: string;
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
    const [expandedMediaUrl, setExpandedMediaUrl] = useState<string | null>(null);
    const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
        name: post.profileId,
    });

    useEffect(() => {
        async function fetchProfileInfo() {
            try {
                if (post.profileType === ProfileType.ORGANIZATION) {
                    // Org privada exige GET autenticado para nome/logo; pública funciona sem sessão.
                    const withAuth = Boolean(session?.accessToken);
                    const org = await getOrganizationBySlug(post.profileId, withAuth);
                    setProfileInfo({
                        name: org.name,
                        logoUrl: org.logo_url || undefined,
                    });
                } else if (post.profileType === ProfileType.TEAM) {
                    const { getTeamDisplayForSocialPost } = await import("@/actions/teams");
                    const team = await getTeamDisplayForSocialPost(post.profileId);
                    setProfileInfo({
                        name: team.name,
                        logoUrl: team.logoUrl || undefined,
                        clubPathId: team.clubPathId,
                    });
                }
            } catch (error) {
            }
        }
        fetchProfileInfo();
    }, [post.profileId, post.profileType, session?.accessToken]);

    useEffect(() => {
        async function fetchLikeStatus() {
            if (!session?.user) return;
            
            try {
                const status = await getPostLikeStatus(post.id);
                setLiked(status.isLiked);
                setLikesCount(
                    typeof status.likesCount === "number"
                        ? status.likesCount
                        : (post.likesCount ?? 0)
                );
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
                return <Badge variant="secondary">Equipe</Badge>;
            case ProfileType.ATHLETE:
                if (post.type === PostType.ACHIEVEMENT) {
                    return <Badge variant="default">Conquista</Badge>;
                }
                return null;
            default:
                return null;
        }
    };

    const teamClubHref =
        post.profileType === ProfileType.TEAM
            ? `/clubes/${profileInfo.clubPathId ?? post.profileId}`
            : null;


    return (
        <>
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Link 
                    href={
                        post.profileType === ProfileType.ATHLETE 
                            ? `/profile/${post.profileId}` 
                            : post.profileType === ProfileType.ORGANIZATION
                            ? `/organizations/${post.profileId}`
                            : teamClubHref ?? `/clubes/${post.profileId}`
                    }
                    className="shrink-0"
                >
                    <Avatar
                        className={`h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity ${
                            post.profileType === ProfileType.ORGANIZATION ? "rounded-lg" : ""
                        }`}
                    >
                        <AvatarImage
                            src={profileInfo.logoUrl || profileInfo.avatarUrl}
                            className={
                                post.profileType === ProfileType.ORGANIZATION ||
                                post.profileType === ProfileType.TEAM
                                    ? "object-contain p-1.5"
                                    : "object-cover"
                            }
                        />
                        <AvatarFallback
                            className={
                                post.profileType === ProfileType.ORGANIZATION ||
                                post.profileType === ProfileType.TEAM
                                    ? "rounded-lg bg-transparent p-0"
                                    : undefined
                            }
                        >
                            {post.profileType === ProfileType.ORGANIZATION ||
                            post.profileType === ProfileType.TEAM ? (
                                <TeamLogo
                                    name={profileInfo.name}
                                    abbreviation={profileInfo.name.slice(0, 3)}
                                    logoUrl=""
                                    className="h-12 w-12"
                                    textClassName="text-xs"
                                />
                            ) : (
                                <span className="text-sm font-semibold">
                                    {profileInfo.name.replace(/[^a-zA-ZÀ-ÿ0-9]/g, "").slice(0, 2).toUpperCase() ||
                                        "?"}
                                </span>
                            )}
                        </AvatarFallback>
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
                                    : teamClubHref ?? `/clubes/${post.profileId}`
                            }
                            className="hover:underline"
                        >
                            <h3 className="font-semibold text-sm">{profileInfo.name}</h3>
                        </Link>
                        {getProfileBadge()}

                        {/* Badge do tipo de post */}
                        {post.type !== PostType.TEXT && (
                            <Badge variant="secondary" className="text-xs">
                                {post.type === PostType.ANNOUNCEMENT && "Anúncio"}
                                {post.type === PostType.EVENT && "Evento"}
                                {post.type === PostType.TRAINING && "Treino"}
                                {post.type === PostType.IMAGE && "Imagem"}
                                {post.type === PostType.ACHIEVEMENT && "Conquista"}
                            </Badge>
                        )}
                        
                        {post.visibility !== PostVisibility.PUBLIC && (
                            <Badge variant="secondary" className="text-xs">
                                {post.visibility === PostVisibility.FOLLOWERS && "Seguidores"}
                                {post.visibility === PostVisibility.MEMBERS_ONLY && "Membros"}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseBackendIsoToDate(post.createdAt), {
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
                {post.type === PostType.ACHIEVEMENT && post.metadata && (
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-4 sm:p-5 shadow-sm ring-1 ring-border/60">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-main/15 text-main ring-1 ring-main/20">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Conquista
                                    </span>
                                    {post.metadata.competitionName && (
                                        <Badge variant="secondary" className="font-normal text-xs">
                                            {String(post.metadata.competitionName)}
                                        </Badge>
                                    )}
                                </div>
                                <h4 className="text-base font-semibold leading-snug text-foreground">
                                    {String(post.metadata.displayName || post.metadata.title || "Conquista")}
                                </h4>
                                {(post.metadata.description || post.metadata.statType) && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {post.metadata.description
                                            ? String(post.metadata.description)
                                            : post.metadata.statType
                                              ? `Métrica: ${String(post.metadata.statType)}`
                                              : ""}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {post.metadata.statValue != null && post.metadata.statValue !== "" && (
                                        <span className="inline-flex items-center rounded-md border border-border/80 bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                                            Total: {String(post.metadata.statValue)}
                                        </span>
                                    )}
                                    {post.metadata.rankPosition != null && (
                                        <span className="inline-flex items-center rounded-md border border-border/80 bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                            Posição #{String(post.metadata.rankPosition)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {post.type !== PostType.ACHIEVEMENT || !post.metadata ? (
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                ) : null}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 justify-start">
                        {post.mediaUrls.map((url, index) => (
                            <button
                                key={index}
                                type="button"
                                className={cn(
                                    "rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center shrink-0 max-h-44 max-w-[200px] sm:max-h-48 sm:max-w-[220px]",
                                    "p-0 border-0 cursor-pointer transition-opacity hover:opacity-90",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                )}
                                onClick={() => setExpandedMediaUrl(url)}
                                aria-label={`Ampliar anexo ${index + 1}`}
                            >
                                <img
                                    src={url}
                                    alt=""
                                    className="max-h-44 max-w-[200px] sm:max-h-48 sm:max-w-[220px] w-auto h-auto object-contain pointer-events-none"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
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

        <Dialog
            open={expandedMediaUrl !== null}
            onOpenChange={(open) => {
                if (!open) setExpandedMediaUrl(null);
            }}
        >
            <DialogContent
                className={cn(
                    "max-w-[min(100vw-1.5rem,1200px)] w-fit p-2 sm:p-3 border-0 bg-transparent shadow-none",
                    "[&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/10"
                )}
            >
                <DialogTitle className="sr-only">Imagem da publicação</DialogTitle>
                {expandedMediaUrl ? (
                    <img
                        src={expandedMediaUrl}
                        alt=""
                        className="max-h-[min(85vh,900px)] max-w-[min(95vw,1200px)] w-auto h-auto object-contain rounded-md"
                        referrerPolicy="no-referrer"
                        decoding="async"
                    />
                ) : null}
            </DialogContent>
        </Dialog>
        </>
    );
}
