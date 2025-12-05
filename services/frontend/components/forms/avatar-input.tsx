"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface AvatarInputProps {
    name?: string;
    currentAvatar?: string | null;
}

export default function AvatarInput({ name = "avatar", currentAvatar }: AvatarInputProps) {
    const [preview, setPreview] = useState<string | null>(currentAvatar || null);
    const [isNewFile, setIsNewFile] = useState(false);

    useEffect(() => {
        if (!isNewFile) {
            setPreview(currentAvatar || null);
        }
    }, [currentAvatar, isNewFile]);

    useEffect(() => {
        return () => {
            if (preview && isNewFile) URL.revokeObjectURL(preview);
        };
    }, [preview, isNewFile]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (preview && isNewFile) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(file));
            setIsNewFile(true);
        }
    }

    const displayAvatar = preview || currentAvatar;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full overflow-hidden border shadow bg-gray-100 relative">
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
            </div>

            <label className="cursor-pointer text-main font-medium">
                {displayAvatar ? 'Alterar avatar' : 'Selecionar avatar'}
                <input
                    type="file"
                    accept="image/*"
                    name={name}
                    className="hidden"
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}
