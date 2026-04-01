"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { updateUserProfile, getUserProfile } from "@/actions/auth";
import AvatarInput from "@/components/forms/avatar-input";
import { resizeAvatarImage } from "@/lib/image/resize-avatar";

const profileSchema = z.object({
  first_name: z.string().min(1, { message: "Nome é obrigatório" }),
  last_name: z.string().optional(),
  username: z.string().min(3, { message: "Username deve ter ao menos 3 caracteres" }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface AuthUserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: AuthUserProfile | null;
  onProfileUpdated: (newData: AuthUserProfile) => void;
}

export function EditProfileModal({ 
  isOpen, 
  onClose, 
  currentData,
  onProfileUpdated 
}: EditProfileModalProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: currentData?.first_name || "",
      last_name: currentData?.last_name || "",
      username: currentData?.username || "",
    }
  });

  useEffect(() => {
    if (currentData) {
      setValue("first_name", currentData.first_name || "");
      setValue("last_name", currentData.last_name || "");
      setValue("username", currentData.username || "");
    }
  }, [currentData, setValue]);

  useEffect(() => {
    if (!isOpen && currentData) {
      reset({
        first_name: currentData.first_name || "",
        last_name: currentData.last_name || "",
        username: currentData.username || "",
      });
    }
  }, [isOpen, currentData, reset]);

  const onSubmit = async (values: ProfileFormValues, e?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    try {
      const formEl =
        (e?.currentTarget as HTMLFormElement | undefined) ||
        (e?.target as HTMLFormElement | undefined);
      const formData = formEl ? new FormData(formEl) : new FormData();

      formData.set("first_name", values.first_name || "");
      formData.set("last_name", values.last_name || "");
      formData.set("username", values.username || "");

      const avatar = formData.get("avatar");
      if (avatar instanceof File && avatar.size > 0) {
        const resizedAvatar = await resizeAvatarImage(avatar);
        formData.set("avatar", resizedAvatar);
      }

      await updateUserProfile(formData);

      const freshProfile = await getUserProfile();
      
      await updateSession({
        user: {
          ...session?.user,
          name: freshProfile.first_name || freshProfile.username,
          image: freshProfile.avatar_url,
        }
      });

      onProfileUpdated({
        id: freshProfile.id,
        username: freshProfile.username,
        email: freshProfile.email,
        first_name: freshProfile.first_name,
        last_name: freshProfile.last_name,
        avatar_url: freshProfile.avatar_url,
      });

      onClose();
      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Erro ao atualizar perfil");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="flex justify-center">
            <AvatarInput 
              name="avatar" 
              currentAvatar={currentData?.avatar_url || session?.user?.image || undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                placeholder="Nome"
                className={errors.first_name ? "border-red-500" : ""}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Sobrenome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              {...register("username")}
              placeholder="Username"
              className={errors.username ? "border-red-500" : ""}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={currentData?.email || session?.user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-main hover:bg-main/90">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
