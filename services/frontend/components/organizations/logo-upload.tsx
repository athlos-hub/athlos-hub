"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoUploadProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  currentLogoUrl?: string | null;
}

export function LogoUpload({ value, onChange, currentLogoUrl }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    currentLogoUrl || null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(currentLogoUrl || null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Logo da Organização</label>
      
      <div className="flex items-end gap-4">
        <div 
          onClick={triggerFileInput}
          className="relative w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-main hover:bg-gray-100 transition-all group"
        >
          {preview ? (
            <>
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImagePlus className="w-8 h-8 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-main transition-colors">
              <Upload className="w-10 h-10" />
              <span className="text-xs font-medium text-center">Upload</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 pb-1">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileInput}
            >
              <Upload className="w-4 h-4 mr-2" />
              {preview ? "Alterar" : "Fazer Upload"}
            </Button>

            {preview && preview !== currentLogoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Recomendado: Imagem quadrada, mínimo 200x200px (PNG, JPG)
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
