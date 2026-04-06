"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateMatch, type MatchUpdateData } from "@/actions/matches";
import { listLives, patchLiveTransmitVideo } from "@/actions/lives";
import {
  backendIsoToDatetimeLocalInput,
  datetimeLocalInputToUtcIsoString,
} from "@/lib/datetime/datetime-local";

interface EditMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    scheduled_datetime?: string;
    local?: string;
    home_team_name?: string;
    away_team_name?: string;
    transmit_video?: boolean;
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

  const [formData, setFormData] = useState<MatchUpdateData>({
    scheduled_datetime: match.scheduled_datetime,
    local: match.local || "",
    transmitVideo: match.transmit_video !== false,
  });

  useEffect(() => {
    if (!open) return;
    console.log("match.scheduled_datetime:", match.scheduled_datetime);
    setFormData({
      scheduled_datetime: match.scheduled_datetime,
      local: match.local || "",
      transmitVideo: match.transmit_video !== false,
    });
  }, [open, match.id, match.scheduled_datetime, match.local, match.transmit_video]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: MatchUpdateData = {
      transmitVideo: formData.transmitVideo !== false,
    };
    if (formData.scheduled_datetime) {
      payload.scheduled_datetime = formData.scheduled_datetime;
    }
    if (formData.local !== undefined) {
      payload.local = formData.local;
    }

    setIsLoading(true);
    try {
      await updateMatch(match.id, payload);

      // Mantém live-service sincronizado com a preferência de transmissão do jogo.
      const lives = await listLives({ externalMatchId: match.id });
      const relatedLive = lives[0];
      if (relatedLive?.id) {
        await patchLiveTransmitVideo(relatedLive.id, payload.transmitVideo !== false);
      }

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
          <DialogDescription>
            Data, local e se a partida terá transmissão em vídeo (padrão: sim).
          </DialogDescription>
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
                value={backendIsoToDatetimeLocalInput(formData.scheduled_datetime)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setFormData({ ...formData, scheduled_datetime: undefined });
                    return;
                  }
                  try {
                    setFormData({
                      ...formData,
                      scheduled_datetime: datetimeLocalInputToUtcIsoString(v),
                    });
                  } catch (err) {
                    const msg =
                      err instanceof Error ? err.message : "Não foi possível interpretar data e hora.";
                    toast.error(msg);
                  }
                }}
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

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 px-3 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="transmit_video" className="text-sm font-medium">
                  Transmitir em vídeo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se desligado, a partida pode ser acompanhada só com placar, chat e eventos.
                </p>
              </div>
              <Switch
                id="transmit_video"
                checked={formData.transmitVideo !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, transmitVideo: checked })}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-main hover:bg-main/90 text-white">
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
