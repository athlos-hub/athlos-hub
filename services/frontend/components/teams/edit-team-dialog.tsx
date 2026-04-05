"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

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
import { LogoUpload } from "@/components/organizations/logo-upload";
import { updateTeam } from "@/actions/teams";
import type { TeamDetail } from "@/types/team";
import { TeamStatus } from "@/types/team";

const schema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(100),
  abbreviation: z
    .string()
    .min(1, "Sigla é obrigatória")
    .max(3, "Máximo 3 caracteres"),
});

type FormValues = z.infer<typeof schema>;

interface EditTeamDialogProps {
  team: TeamDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (team: TeamDetail) => void;
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdated,
}: EditTeamDialogProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const approved = team.status === TeamStatus.APPROVED;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: team.name,
      abbreviation: team.abbreviation,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: team.name,
        abbreviation: team.abbreviation,
      });
      setLogoFile(null);
      setRemoveLogo(false);
    }
  }, [open, team, reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (!approved) {
        fd.set("name", values.name.trim());
        fd.set("abbreviation", values.abbreviation.trim().toUpperCase().slice(0, 3));
      }
      if (logoFile) {
        fd.set("logo", logoFile);
      } else if (removeLogo) {
        fd.set("remove_logo", "true");
      }

      const updated = await updateTeam(team.id, fd);
      onUpdated(updated);
      toast.success("Time atualizado.");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar time";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar equipe</DialogTitle>
          <DialogDescription>
            {approved
              ? "Este time já está aprovado na competição. Você só pode alterar o escudo."
              : "Atualize nome, sigla e o escudo. O mínimo e o máximo de jogadores vêm da competição."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <LogoUpload
              label="Escudo do time"
              allowRemoveRemote
              value={logoFile}
              currentLogoUrl={team.logo_url}
              onChange={(file) => {
                setLogoFile(file);
                if (file) {
                  setRemoveLogo(false);
                } else {
                  setRemoveLogo(!!team.logo_url);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Escudo opcional. Sem imagem, usamos a sigla no padrão da plataforma.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-name">Nome da equipe</Label>
            <Input
              id="team-name"
              {...register("name")}
              disabled={approved}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-abbr">Sigla (até 3 letras)</Label>
            <Input
              id="team-abbr"
              maxLength={3}
              {...register("abbreviation")}
              disabled={approved}
              className={errors.abbreviation ? "border-red-500" : ""}
            />
            {errors.abbreviation && (
              <p className="text-sm text-red-600">{errors.abbreviation.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="bg-main hover:bg-main/90">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTeamDialogTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Pencil className="h-4 w-4" />
      Editar equipe
    </Button>
  );
}
