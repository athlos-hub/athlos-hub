"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createLive } from "@/actions/lives";
import { Loader2 } from "lucide-react";

const createLiveSchema = z.object({
  externalMatchId: z.string().uuid({ message: "ID da partida deve ser um UUID válido" }),
  organizationId: z.string().uuid({ message: "ID da organização deve ser um UUID válido" }),
});

type CreateLiveFormValues = z.infer<typeof createLiveSchema>;

export function CreateLiveForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLiveFormValues>({
    resolver: zodResolver(createLiveSchema),
  });

  async function onSubmit(values: CreateLiveFormValues) {
    setIsSubmitting(true);

    try {
      const live = await createLive(values);
      toast.success("Live criada com sucesso!");
      router.push(`/lives/${live.id}`);
    } catch (error) {
      console.error("Erro ao criar live:", error);
      toast.error("Erro ao criar live. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Nova Live</CardTitle>
        <CardDescription>
          Preencha as informações abaixo para criar uma nova transmissão ao vivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalMatchId">ID da Partida</Label>
            <Input
              id="externalMatchId"
              placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              {...register("externalMatchId")}
              disabled={isSubmitting}
            />
            {errors.externalMatchId && (
              <p className="text-sm text-destructive">{errors.externalMatchId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationId">ID da Organização</Label>
            <Input
              id="organizationId"
              placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              {...register("organizationId")}
              disabled={isSubmitting}
            />
            {errors.organizationId && (
              <p className="text-sm text-destructive">{errors.organizationId.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-main hover:bg-main/90 text-white" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Live"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
