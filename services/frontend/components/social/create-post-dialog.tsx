"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePostForm } from "./create-post-form";
import { CreatePostPayload } from "@/types/social";

interface CreatePostDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profileType: 'organization' | 'team';
    profileId: string;
    onSubmit: (payload: CreatePostPayload) => Promise<void>;
}

export function CreatePostDialog({
    open,
    onOpenChange,
    profileType,
    profileId,
    onSubmit
}: CreatePostDialogProps) {
    const handleSubmit = async (payload: CreatePostPayload) => {
        await onSubmit(payload);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Criar Nova Publicação</DialogTitle>
                    <DialogDescription>
                        Compartilhe novidades, conquistas e atualizações com a comunidade.
                    </DialogDescription>
                </DialogHeader>
                <CreatePostForm
                    profileType={profileType}
                    profileId={profileId}
                    onSubmit={handleSubmit}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
