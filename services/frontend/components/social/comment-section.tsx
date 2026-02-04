"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Trash2, Edit2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { 
  CommentResponse, 
  createComment, 
  getComments, 
  updateComment, 
  deleteComment 
} from "@/actions/social-comments";
import { getUserPublicInfo } from "@/actions/users";
import { User } from "@/types/user";
import { toast } from "sonner";

interface CommentSectionProps {
  postId: string;
  initialCommentsCount: number;
  onCommentCountChange?: (count: number) => void;
}

interface CommentWithUser extends CommentResponse {
  user?: User | null;
}

export function CommentSection({ postId, initialCommentsCount, onCommentCountChange }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await getComments(postId);
      
      const commentsWithUsers = await Promise.all(
        response.content.map(async (comment) => {
          try {
            const user = await getUserPublicInfo(comment.keycloakId);
            return { ...comment, user };
          } catch {
            return { ...comment, user: null };
          }
        })
      );
      
      setComments(commentsWithUsers);
    } catch (error) {
      toast.error("Erro ao carregar comentários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      toast.error("Faça login para comentar");
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await createComment(postId, newComment.trim());
      
      const commentWithUser: CommentWithUser = {
        ...comment,
        user: {
          id: session.user.id || "",
          username: session.user.name || "",
          email: session.user.email || "",
          first_name: session.user.name?.split(" ")[0] || null,
          last_name: session.user.name?.split(" ").slice(1).join(" ") || null,
          avatar_url: session.user.image || null,
        },
      };
      
      setComments([commentWithUser, ...comments]);
      setNewComment("");
      const newCount = commentsCount + 1;
      setCommentsCount(newCount);
      onCommentCountChange?.(newCount);
      toast.success("Comentário adicionado!");
    } catch (error: any) {
      if (error?.status === 422 || error?.message?.toLowerCase().includes("moderação")) {
        toast.error("Seu comentário foi bloqueado pela moderação automática por conter conteúdo inadequado.");
      } else {
        toast.error("Erro ao adicionar comentário");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const updated = await updateComment(postId, commentId, editContent.trim());
      setComments(comments.map(c => c.id === commentId ? { ...updated, user: c.user } : c));
      setEditingId(null);
      setEditContent("");
      toast.success("Comentário editado!");
    } catch (error: any) {
      // Tratamento específico para erros de moderação (status 422)
      if (error?.status === 422 || error?.message?.toLowerCase().includes("moderação")) {
        toast.error("Sua edição foi bloqueada pela moderação automática por conter conteúdo inadequado.");
      } else {
        toast.error("Erro ao editar comentário");
      }
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(postId, commentId);
      setComments(comments.filter(c => c.id !== commentId));
      const newCount = commentsCount - 1;
      setCommentsCount(newCount);
      onCommentCountChange?.(newCount);
      toast.success("Comentário removido!");
    } catch (error) {
      toast.error("Erro ao remover comentário");
    }
  };

  const startEdit = (comment: CommentWithUser) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const getUserDisplayName = (comment: CommentWithUser): string => {
    if (comment.user) {
      if (comment.user.first_name && comment.user.last_name) {
        return `${comment.user.first_name} ${comment.user.last_name}`;
      }
      if (comment.user.first_name) {
        return comment.user.first_name;
      }
      if (comment.user.username) {
        return comment.user.username;
      }
    }
    return "Usuário";
  };

  const getUserInitials = (comment: CommentWithUser): string => {
    const name = getUserDisplayName(comment);
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 pl-4 border-l-2 border-muted">
      {session?.user && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || undefined} />
            <AvatarFallback>
              {session.user.name?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim()}
                className="bg-main hover:bg-main/90"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Enviar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link 
                    href={`/profile/${comment.keycloakId}`}
                    className="shrink-0"
                  >
                    <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={comment.user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {getUserInitials(comment)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/profile/${comment.keycloakId}`}
                            className="hover:underline"
                          >
                            <span className="text-sm font-medium">
                              {getUserDisplayName(comment)}
                            </span>
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                            {comment.isEdited && " (editado)"}
                          </span>
                        </div>
                        {(() => {
                          const userKeycloakId = session?.user?.keycloakId;
                          const canEdit = session?.user && comment.keycloakId === userKeycloakId;
                          return canEdit && (
                            <div className="flex gap-1">
                            {editingId === comment.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleEdit(comment.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => startEdit(comment)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleDelete(comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          );
                        })()}
                      </div>
                      {editingId === comment.id ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px] resize-none"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}
