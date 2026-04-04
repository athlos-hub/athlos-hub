"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Cropper, { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
    AVATAR_LIMIT_EXCEEDED_MESSAGE,
    MAX_FINAL_AVATAR_BYTES,
    resizeAvatarImage,
} from "@/lib/image/resize-avatar";

/** Converte URL (https, blob: ou mesma origem) em File para o fluxo de crop/redimensionar. */
async function imageUrlToFile(url: string): Promise<File> {
    const useProxy =
        url.startsWith("http://") || url.startsWith("https://");
    const fetchUrl = useProxy
        ? `/api/avatar-fetch?url=${encodeURIComponent(url)}`
        : url;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
        throw new Error(`Falha ao carregar imagem (${res.status})`);
    }
    const blob = await res.blob();
    const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    return new File([blob], `avatar.${ext}`, { type });
}

interface AvatarInputProps {
    name?: string;
    currentAvatar?: string | null;
}

export default function AvatarInput({ name = "avatar", currentAvatar }: AvatarInputProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = useState<string | null>(currentAvatar || null);
    const [isNewFile, setIsNewFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Fonte completa para o crop: não substituir pelo ficheiro já recortado/redimensionado. */
    const [masterSourceFile, setMasterSourceFile] = useState<File | null>(null);

    const [editorOpen, setEditorOpen] = useState(false);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourcePreview, setSourcePreview] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isOpeningEditor, setIsOpeningEditor] = useState(false);

    useEffect(() => {
        if (!isNewFile) {
            setPreview(currentAvatar || null);
            setMasterSourceFile(null);
        }
    }, [currentAvatar, isNewFile]);

    useEffect(() => {
        return () => {
            if (preview && isNewFile) URL.revokeObjectURL(preview);
            if (sourcePreview) URL.revokeObjectURL(sourcePreview);
        };
    }, [preview, isNewFile, sourcePreview]);

    const closeEditor = useCallback(() => {
        setEditorOpen(false);
        setSourceFile(null);
        if (sourcePreview) URL.revokeObjectURL(sourcePreview);
        setSourcePreview(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    }, [sourcePreview]);

    const openEditorForFile = useCallback(
        (file: File) => {
            setError(null);
            if (sourcePreview) URL.revokeObjectURL(sourcePreview);
            setSourceFile(file);
            setSourcePreview(URL.createObjectURL(file));
            setEditorOpen(true);
        },
        [sourcePreview]
    );

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        setMasterSourceFile(file);
        openEditorForFile(file);
    }

    const handleImageClick = useCallback(async () => {
        if (masterSourceFile) {
            openEditorForFile(masterSourceFile);
            return;
        }

        const urlToEdit = currentAvatar || null;
        if (urlToEdit) {
            setIsOpeningEditor(true);
            try {
                const file = await imageUrlToFile(urlToEdit);
                setMasterSourceFile(file);
                openEditorForFile(file);
            } catch {
                toast.error(
                    "Não foi possível abrir a foto para redimensionar. Envie uma nova imagem."
                );
                inputRef.current?.click();
            } finally {
                setIsOpeningEditor(false);
            }
            return;
        }

        inputRef.current?.click();
    }, [currentAvatar, openEditorForFile, masterSourceFile]);

    function handlePickNewFileClick() {
        inputRef.current?.click();
    }

    async function handleApplyCrop() {
        if (!sourceFile || !inputRef.current) return;

        try {
            setIsProcessing(true);
            setError(null);
            const resizedFile = await resizeAvatarImage(sourceFile, {
                cropAreaPixels: croppedAreaPixels
                    ? {
                        x: croppedAreaPixels.x,
                        y: croppedAreaPixels.y,
                        width: croppedAreaPixels.width,
                        height: croppedAreaPixels.height,
                    }
                    : undefined,
            });

            if (resizedFile.size > MAX_FINAL_AVATAR_BYTES) {
                throw new Error("Imagem final ainda muito grande, escolha outra.");
            }

            const transfer = new DataTransfer();
            transfer.items.add(resizedFile);
            inputRef.current.files = transfer.files;

            if (preview && isNewFile) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(resizedFile));
            setIsNewFile(true);
            closeEditor();
        } catch (err) {
            if (err instanceof Error && err.message === AVATAR_LIMIT_EXCEEDED_MESSAGE) {
                setError(AVATAR_LIMIT_EXCEEDED_MESSAGE);
            } else {
                setError(null);
            }
        } finally {
            setIsProcessing(false);
        }
    }

    const displayAvatar = preview || currentAvatar;
    const hasImage = Boolean(displayAvatar);
    const useNativeImg =
        Boolean(displayAvatar) &&
        (displayAvatar!.startsWith("blob:") || displayAvatar!.startsWith("data:"));

    return (
        <div className="flex flex-col items-center gap-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                name={name}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={handleChange}
            />

            <button
                type="button"
                onClick={handleImageClick}
                disabled={isOpeningEditor || isProcessing}
                className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-main/40 disabled:opacity-70"
                aria-label={hasImage ? "Redimensionar avatar" : "Enviar imagem do avatar"}
            >
                {displayAvatar ? (
                    useNativeImg ? (
                        <img
                            src={displayAvatar}
                            alt="Prévia do avatar"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    ) : (
                        <Image
                            src={displayAvatar}
                            alt="Prévia do avatar"
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    )
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                        Foto
                    </div>
                )}
                {isOpeningEditor && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {hasImage ? (
                        <>
                            <Maximize2 className="h-5 w-5 text-white" aria-hidden />
                            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                                Redimensionar
                            </span>
                        </>
                    ) : (
                        <>
                            <Upload className="h-5 w-5 text-white" aria-hidden />
                            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                                Enviar imagem
                            </span>
                        </>
                    )}
                </div>
            </button>

            {hasImage && (
                <button
                    type="button"
                    onClick={handlePickNewFileClick}
                    disabled={isOpeningEditor || isProcessing}
                    className="text-sm font-medium text-main underline-offset-4 hover:underline disabled:opacity-50"
                >
                    Enviar nova imagem
                </button>
            )}

            {isProcessing && (
                <p className="text-xs text-muted-foreground">Aplicando redimensionamento…</p>
            )}
            {error && (
                <p className="text-xs text-red-600 text-center max-w-64">{error}</p>
            )}

            <Dialog
                open={editorOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditor();
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ajustar avatar</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black/80">
                            {sourcePreview && (
                                <Cropper
                                    image={sourcePreview}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                                    showGrid={false}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Zoom</p>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (inputRef.current) inputRef.current.value = "";
                                    closeEditor();
                                }}
                                disabled={isProcessing}
                            >
                                Cancelar
                            </Button>
                            <Button className="bg-main hover:bg-main/90 text-white" type="button" onClick={handleApplyCrop} disabled={isProcessing}>
                                {isProcessing ? "Aplicando..." : "Aplicar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
