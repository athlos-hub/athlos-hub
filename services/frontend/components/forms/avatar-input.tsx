"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface AvatarInputProps {
    name?: string;
}

export default function AvatarInput({ name = "avatar" }: AvatarInputProps) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) setPreview(URL.createObjectURL(file));
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full overflow-hidden border shadow bg-gray-100 relative">
                {preview ? (
                    <Image
                        src={preview}
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
                Selecionar avatar
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
