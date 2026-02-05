"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createModality } from "@/actions/modalities";
import type { ModalityCreate } from "@/types/modality";

interface CreateModalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgCode: string;
  onSuccess: () => void;
}

export function CreateModalityDialog({
  open,
  onOpenChange,
  orgCode,
  onSuccess,
}: CreateModalityDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Digite o nome da modalidade");
      return;
    }

    try {
      setIsLoading(true);
      const data: ModalityCreate = {
        name: name.trim(),
        organization_slug: orgCode,
      };
      await createModality(data);
      toast.success("Modalidade criada com sucesso!");
      setName("");
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar modalidade:", error);
      toast.error("Erro ao criar modalidade");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Modalidade</DialogTitle>
          <DialogDescription>
            Adicione uma nova modalidade esportiva para a organização
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Modalidade *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Futsal, Vôlei, Basquete..."
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-main hover:bg-main/90 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
