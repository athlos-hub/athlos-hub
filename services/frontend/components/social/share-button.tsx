"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Link2, Repeat2, Loader2, Check, Trash2 } from "lucide-react";
import { sharePost, unsharePost } from "@/actions/shares";
import { generatePostLink } from "@/lib/utils/share-links";

interface ShareButtonProps {
  postId: string;
  sharesCount: number;
  hasShared?: boolean;
  onShare?: () => void;
  onUnshare?: () => void;
}

export function ShareButton({ postId, sharesCount, hasShared = false, onShare, onUnshare }: ShareButtonProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = async () => {
    const link = generatePostLink(postId);
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
    setIsOpen(false);
  };

  const handleShareToProfile = async () => {
    if (!session) {
      toast.error("Você precisa estar logado para compartilhar");
      return;
    }

    setIsLoading(true);
    try {
      await sharePost(postId, comment || undefined);
      toast.success("Post compartilhado no seu perfil!");
      setIsShareDialogOpen(false);
      setComment("");
      onShare?.();
    } catch (error: any) {
      if (error?.message?.includes("já compartilhou")) {
        toast.error("Você já compartilhou este post");
      } else {
        toast.error("Erro ao compartilhar");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!session) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsLoading(true);
    try {
      await unsharePost(postId);
      toast.success("Compartilhamento removido!");
      setIsOpen(false);
      onUnshare?.();
    } catch (error: any) {
      toast.error("Erro ao remover compartilhamento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${hasShared ? "text-green-600" : "text-muted-foreground"} hover:text-green-600`}
          >
            <Share2 className="h-4 w-4" />
            <span>{sharesCount}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
            {isCopied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Copiar link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {hasShared ? (
            <DropdownMenuItem
              onClick={handleUnshare}
              className="gap-2 cursor-pointer text-red-600"
              disabled={!session || isLoading}
            >
              <Trash2 className="h-4 w-4" />
              Remover compartilhamento
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                setIsShareDialogOpen(true);
              }}
              className="gap-2 cursor-pointer"
              disabled={!session}
            >
              <Repeat2 className="h-4 w-4" />
              Compartilhar no perfil
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para compartilhar com comentário */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Compartilhar Post</DialogTitle>
            <DialogDescription>
              Adicione um comentário (opcional) e compartilhe este post no seu perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Adicione um comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleShareToProfile} disabled={isLoading} className="bg-main hover:bg-main/90">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Compartilhando...
                </>
              ) : (
                <>
                  <Repeat2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
