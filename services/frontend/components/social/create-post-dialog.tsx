"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePostForm } from "./create-post-form";
import { CreatePostPayload } from "@/types/social";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileType: "organization" | "team";
  profileId: string;
  profileName: string;
  onSubmit: (payload: CreatePostPayload) => Promise<void>;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  profileType,
  profileId,
  profileName,
  onSubmit,
}: CreatePostDialogProps) {
  const handleSubmit = async (payload: CreatePostPayload) => {
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px] max-h-[min(90vh,720px)] flex flex-col">
        <DialogHeader className="space-y-1 border-b border-border/80 bg-gradient-to-br from-muted/50 to-muted/20 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Nova publicação
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            A visibilidade controla quem vê o post nos feeds e nos murais (detalhes no aviso abaixo).
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5">
          <CreatePostForm
            profileType={profileType}
            profileId={profileId}
            profileName={profileName}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
