"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreatePostPayload, PostType, PostVisibility } from "@/types/social";
import { Image, Send, X } from "lucide-react";
import { toast } from "sonner";

interface CreatePostFormProps {
    profileType: 'organization' | 'team';
    profileId: string;
    profileName: string;
    onSubmit: (payload: CreatePostPayload) => Promise<void>;
    onCancel?: () => void;
}

export function CreatePostForm({ profileType, profileId, profileName, onSubmit, onCancel }: CreatePostFormProps) {
    const [content, setContent] = useState("");
    const [type, setType] = useState<PostType>(PostType.TEXT);
    const [visibility, setVisibility] = useState<PostVisibility>(PostVisibility.PUBLIC);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            toast.error("O conteúdo do post não pode estar vazio");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                content: content.trim(),
                type,
                visibility,
            });
            setContent("");
            setType(PostType.TEXT);
            setVisibility(PostVisibility.PUBLIC);
            toast.success("Post criado com sucesso!");
        } catch (error) {
            toast.error("Erro ao criar post. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Criar Post</CardTitle>
                    <Badge variant={profileType === 'organization' ? 'secondary' : 'outline'}>
                        {profileType === 'organization' ? '🏢 Organização' : '👥 Equipe'}: {profileName}
                    </Badge>
                </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="O que você quer compartilhar?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        className="resize-none"
                        disabled={isSubmitting}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Post</label>
                            <Select
                                value={type}
                                onValueChange={(value) => setType(value as PostType)}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={PostType.TEXT}>💬 Texto</SelectItem>
                                    <SelectItem value={PostType.ANNOUNCEMENT}>📢 Anúncio</SelectItem>
                                    <SelectItem value={PostType.EVENT}>📅 Evento</SelectItem>
                                    <SelectItem value={PostType.TRAINING}>💪 Treino</SelectItem>
                                    <SelectItem value={PostType.IMAGE}>🖼️ Imagem</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Visibilidade</label>
                            <Select
                                value={visibility}
                                onValueChange={(value) => setVisibility(value as PostVisibility)}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={PostVisibility.PUBLIC}>🌍 Público</SelectItem>
                                    <SelectItem value={PostVisibility.FOLLOWERS}>👥 Seguidores</SelectItem>
                                    <SelectItem value={PostVisibility.MEMBERS_ONLY}>🔒 Apenas Membros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                    <Button type="button" variant="ghost" size="icon" disabled={isSubmitting}>
                        <Image className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                        )}
                        <Button className="bg-main hover:bg-main/90" type="submit" disabled={isSubmitting || !content.trim()}>
                            <Send className="h-4 w-4 mr-2" />
                            {isSubmitting ? "Publicando..." : "Publicar"}
                        </Button>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}
