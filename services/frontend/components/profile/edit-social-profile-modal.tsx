"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Check, MapPin, Trophy } from "lucide-react";
import { AthleteProfile, updateAthleteProfile } from "@/actions/athlete-profile";

const socialProfileSchema = z.object({
  specialization: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type SocialProfileFormValues = z.infer<typeof socialProfileSchema>;

interface EditSocialProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: AthleteProfile;
  onProfileUpdated: (newProfile: AthleteProfile) => void;
}

export function EditSocialProfileModal({ 
  isOpen, 
  onClose, 
  currentProfile,
  onProfileUpdated 
}: EditSocialProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<SocialProfileFormValues>({
    resolver: zodResolver(socialProfileSchema),
    defaultValues: {
      specialization: currentProfile?.specialization || "",
      city: currentProfile?.city || "",
      state: currentProfile?.state || "",
      country: currentProfile?.country || "",
    }
  });

  useEffect(() => {
    if (currentProfile) {
      setValue("specialization", currentProfile.specialization || "");
      setValue("city", currentProfile.city || "");
      setValue("state", currentProfile.state || "");
      setValue("country", currentProfile.country || "");
    }
  }, [currentProfile, setValue]);

  useEffect(() => {
    if (!isOpen && currentProfile) {
      reset({
        specialization: currentProfile.specialization || "",
        city: currentProfile.city || "",
        state: currentProfile.state || "",
        country: currentProfile.country || "",
      });
    }
  }, [isOpen, currentProfile, reset]);

  const onSubmit = async (values: SocialProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const updatedProfile = await updateAthleteProfile({
        specialization: values.specialization || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        country: values.country || undefined,
      });

      onProfileUpdated(updatedProfile);
      onClose();
      toast.success("Perfil atualizado com sucesso!");
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
          <DialogTitle>Completar Perfil</DialogTitle>
          <DialogDescription>
            Adicione informações sobre sua carreira esportiva
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="specialization" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Especialização Esportiva
            </Label>
            <Input
              id="specialization"
              {...register("specialization")}
              placeholder="Ex: Corrida de 100m, Natação, Futebol..."
            />
            <p className="text-xs text-muted-foreground">
              Qual é sua modalidade ou especialização esportiva?
            </p>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-normal">Cidade</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Sua cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-normal">Estado</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder="Seu estado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-normal">País</Label>
              <Input
                id="country"
                {...register("country")}
                placeholder="Seu país"
                defaultValue="Brasil"
              />
            </div>
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
