"use client";

import { useState } from "react";
import { Calendar, MapPin, Loader2 } from "lucide-react";
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
import { updateMatch, type MatchUpdateData } from "@/actions/matches";

interface EditMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    scheduled_datetime?: string;
    local?: string;
    home_team_name?: string;
    away_team_name?: string;
  };
  onSuccess: () => void;
}

export function EditMatchDialog({
  open,
  onOpenChange,
  match,
  onSuccess,
}: EditMatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Converte a data do formato ISO para datetime-local
  const getDatetimeLocalValue = (isoDate?: string) => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      // Formata para yyyy-MM-ddTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const [formData, setFormData] = useState<MatchUpdateData>({
    scheduled_datetime: match.scheduled_datetime,
    local: match.local || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scheduled_datetime && !formData.local) {
      toast.error("Preencha pelo menos um campo para atualizar");
      return;
    }

    setIsLoading(true);
    try {
      await updateMatch(match.id, formData);
      toast.success("Jogo atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar jogo";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Jogo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_datetime" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data e Hora
              </Label>
              <Input
                id="scheduled_datetime"
                type="datetime-local"
                value={getDatetimeLocalValue(formData.scheduled_datetime)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  scheduled_datetime: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Local
              </Label>
              <Input
                id="local"
                value={formData.local || ""}
                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                placeholder="Ex: Ginásio Municipal"
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
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-main hover:bg-main/90 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
