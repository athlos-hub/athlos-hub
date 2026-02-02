"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check } from "lucide-react";
import { generateProfileLink } from "@/lib/utils/share-links";

interface ShareProfileButtonProps {
  keycloakId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function ShareProfileButton({
  keycloakId,
  variant = "outline",
  size = "sm",
  showText = false,
}: ShareProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = async () => {
    const link = generateProfileLink(keycloakId);
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      toast.success("Link do perfil copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    const link = generateProfileLink(keycloakId);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Perfil no AthlosHub",
          text: "Confira este perfil no AthlosHub!",
          url: link,
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          toast.error("Erro ao compartilhar");
        }
      }
    } else {
      handleCopyLink();
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4" />
          {showText && <span className="ml-2">Compartilhar</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {isCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Copiar link do perfil
        </DropdownMenuItem>
        {typeof window !== "undefined" && "share" in navigator && (
          <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
            <Share2 className="h-4 w-4" />
            Compartilhar...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
