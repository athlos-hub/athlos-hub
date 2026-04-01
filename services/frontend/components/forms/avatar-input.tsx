"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Cropper, { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AVATAR_LIMIT_EXCEEDED_MESSAGE,
    MAX_FINAL_AVATAR_BYTES,
    resizeAvatarImage,
} from "@/lib/image/resize-avatar";

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
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const [editorOpen, setEditorOpen] = useState(false);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourcePreview, setSourcePreview] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    useEffect(() => {
        if (!isNewFile) {
            setPreview(currentAvatar || null);
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
        setOriginalFile(file);
        openEditorForFile(file);
    }

    function handleImageClick() {
        if (originalFile) {
            openEditorForFile(originalFile);
            return;
        }
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

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                type="button"
                onClick={handleImageClick}
                className="group w-28 h-28 rounded-full overflow-hidden border shadow bg-gray-100 relative focus:outline-none focus:ring-2 focus:ring-main/40"
                aria-label="Editar avatar"
            >
                {displayAvatar ? (
                    <Image
                        src={displayAvatar}
                        alt="Prévia do avatar"
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        Foto
                    </div>
                )}
                <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <span className="text-[11px] font-medium text-white text-center px-2">
                        {displayAvatar ? "Redimensionar imagem" : "Carregar imagem"}
                    </span>
                </div>
            </button>

            <label className="cursor-pointer text-main font-medium">
                {isProcessing
                    ? "Aplicando redimensionamento..."
                    : displayAvatar
                        ? "Alterar avatar"
                        : "Selecionar avatar"}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    name={name}
                    className="hidden"
                    onChange={handleChange}
                />
            </label>
            {error && (
                <p className="text-xs text-red-600 text-center max-w-64">{error}</p>
            )}

            <Dialog
                open={editorOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        if (inputRef.current) inputRef.current.value = "";
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
