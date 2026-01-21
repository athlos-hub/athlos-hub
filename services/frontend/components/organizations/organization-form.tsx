"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createOrganization } from "@/actions/organizations";
import { OrganizationPrivacy } from "@/types/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogoUpload } from "./logo-upload";
import { Loader2 } from "lucide-react";

const organizationSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  description: z.string().optional(),
  privacy: z.nativeEnum(OrganizationPrivacy),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      privacy: OrganizationPrivacy.PUBLIC,
    },
  });

  const privacy = watch("privacy");

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("privacy", data.privacy);

      if (logo) {
        formData.append("logo", logo);
      }

      const organization = await createOrganization(formData);

      toast.success("Organização criada com sucesso!");
      router.push(`/organizations/${organization.slug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar organização";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <LogoUpload value={logo} onChange={setLogo} />

      <div className="space-y-2">
        <Label htmlFor="name">Nome da Organização *</Label>
        <Input
          id="name"
          placeholder="Ex: Clube Atlético Central"
          {...register("name")}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva sua organização..."
          rows={4}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Privacidade *</Label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
              privacy === OrganizationPrivacy.PUBLIC
                ? "border-[#1F78FF] bg-[#1F78FF]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              value={OrganizationPrivacy.PUBLIC}
              {...register("privacy")}
              className="sr-only"
            />
            <span className="font-semibold text-gray-900 mb-1">Pública</span>
            <span className="text-sm text-gray-600">
              Qualquer pessoa pode ver e solicitar adesão
            </span>
          </label>

          <label
            className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
              privacy === OrganizationPrivacy.PRIVATE
                ? "border-[#1F78FF] bg-[#1F78FF]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              value={OrganizationPrivacy.PRIVATE}
              {...register("privacy")}
              className="sr-only"
            />
            <span className="font-semibold text-gray-900 mb-1">Privada</span>
            <span className="text-sm text-gray-600">
              Apenas membros convidados podem ver e participar
            </span>
          </label>
        </div>
        {errors.privacy && (
          <p className="text-sm text-red-600">{errors.privacy.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-main hover:bg-main/90 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Organização"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
