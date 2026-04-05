"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CreatePostPayload, PostType, PostVisibility } from "@/types/social";
import { ImagePlus, Info, Loader2, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadSocialPostImage } from "@/actions/social-post-media";
import { APIException } from "@/lib/api/errors";
import Image from "next/image";

const MAX_IMAGES = 4;
const MAX_MB = 5;

type LocalImage = { id: string; file: File; preview: string };

/** Tipos que o utilizador pode escolher (alinhados ao backend: string livre; estes são os usuais). */
const CREATOR_POST_TYPES: { value: PostType; label: string; hint: string }[] = [
  { value: PostType.TEXT, label: "Texto", hint: "Publicação geral" },
  { value: PostType.ANNOUNCEMENT, label: "Anúncio", hint: "Comunicado oficial" },
  { value: PostType.EVENT, label: "Evento", hint: "Datas e convites" },
  { value: PostType.TRAINING, label: "Treino", hint: "Atividades e preparação" },
  { value: PostType.IMAGE, label: "Imagem", hint: "Foco em fotos anexadas" },
  { value: PostType.VIDEO, label: "Vídeo", hint: "Conteúdo em vídeo (URL no texto, se aplicável)" },
];

interface CreatePostFormProps {
  profileType: "organization" | "team";
  profileId: string;
  profileName: string;
  onSubmit: (payload: CreatePostPayload) => Promise<void>;
  onCancel?: () => void;
}

export function CreatePostForm({
  profileType,
  profileId: _profileId,
  profileName,
  onSubmit,
  onCancel,
}: CreatePostFormProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>(PostType.TEXT);
  const [visibility, setVisibility] = useState<PostVisibility>(PostVisibility.PUBLIC);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(false);

  const revokePreview = useCallback((preview: string) => {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  }, []);

  useEffect(() => {
    return () => {
      localImages.forEach((img) => revokePreview(img.preview));
    };
  }, [localImages, revokePreview]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: LocalImage[] = [...localImages];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name} excede ${MAX_MB}MB`);
        continue;
      }
      if (next.length >= MAX_IMAGES) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        break;
      }
      const preview = URL.createObjectURL(file);
      next.push({ id: crypto.randomUUID(), file, preview });
    }
    setLocalImages(next);
    if (next.length > localImages.length && type === PostType.TEXT) {
      setType(PostType.IMAGE);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setLocalImages((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) revokePreview(found.preview);
      const rest = prev.filter((x) => x.id !== id);
      if (rest.length === 0 && type === PostType.IMAGE) {
        setType(PostType.TEXT);
      }
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Escreva algo para publicar");
      return;
    }

    if (type === PostType.IMAGE && localImages.length === 0) {
      toast.error('Para o tipo "Imagem", adicione pelo menos uma foto');
      return;
    }

    setIsSubmitting(true);
    setUploadPhase(!!localImages.length);

    try {
      const mediaUrls: string[] = [];
      for (const { file } of localImages) {
        const fd = new FormData();
        fd.append("image", file);
        const url = await uploadSocialPostImage(fd);
        mediaUrls.push(url);
      }
      setUploadPhase(false);

      let submitType = type;
      if (mediaUrls.length > 0) {
        submitType = type === PostType.TEXT ? PostType.IMAGE : type;
      }

      await onSubmit({
        content: content.trim(),
        type: submitType,
        visibility,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      });

      localImages.forEach((img) => revokePreview(img.preview));
      setLocalImages([]);
      setContent("");
      setType(PostType.TEXT);
      setVisibility(PostVisibility.PUBLIC);
      toast.success("Post criado com sucesso!");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Erro ao criar post. Tente novamente.";
      const validation =
        error instanceof APIException && (error.isValidationError() || error.status === 422);
      if (validation || msg.toLowerCase().includes("moderação")) {
        toast.error(
          "Seu post foi bloqueado pela moderação automática por conter conteúdo inadequado."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setUploadPhase(false);
      setIsSubmitting(false);
    }
  };

  const profileLabel = profileType === "organization" ? "Organização" : "Equipe";
  const busy = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5">
        <span className="text-sm font-semibold tracking-wide text-muted-foreground">
          Publicando como
        </span>
        <span className="inline-flex items-center rounded-full bg-background px-3 py-1 text-sm font-medium shadow-sm">
          {profileName}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="post-content" className="text-sm font-medium">
          Texto
        </Label>
        <Textarea
          id="post-content"
          placeholder="O que você quer compartilhar?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="min-h-[140px] resize-none border-border/80 bg-background text-base leading-relaxed shadow-sm"
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">Fotos</Label>
          <span className="text-xs text-muted-foreground">
            Até {MAX_IMAGES} · PNG, JPG, WebP · máx. {MAX_MB}MB
          </span>
        </div>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          disabled={busy}
        />
        <div className="rounded-xl border border-dashed border-border/90 bg-muted/20 p-3">
          {localImages.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {localImages.map((img) => (
                <div
                  key={img.id}
                  className="relative h-24 w-24 overflow-hidden rounded-lg border bg-background shadow-sm"
                >
                  <Image
                    src={img.preview}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    disabled={busy}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                    aria-label="Remover imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {localImages.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground transition hover:border-main hover:bg-main/5 hover:text-main"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs font-medium">Adicionar</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-8 text-sm text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              <Upload className="h-5 w-5" />
              Clique para escolher imagens
            </button>
          )}
        </div>
      </div>

      <Separator className="bg-border/60" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo</Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as PostType)}
            disabled={busy}
          >
            <SelectTrigger className="border-border/80 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {CREATOR_POST_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} title={opt.hint}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Quem pode ver</Label>
          <Select
            value={visibility}
            onValueChange={(value) => setVisibility(value as PostVisibility)}
            disabled={busy}
          >
            <SelectTrigger className="border-border/80 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PostVisibility.PUBLIC}>Público</SelectItem>
              <SelectItem value={PostVisibility.FOLLOWERS}>Seguidores</SelectItem>
              <SelectItem value={PostVisibility.MEMBERS_ONLY}>Apenas membros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="bg-main hover:bg-main/90"
          disabled={busy || !content.trim()}
        >
          {uploadPhase ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando imagens…
            </>
          ) : busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publicando…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Publicar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
