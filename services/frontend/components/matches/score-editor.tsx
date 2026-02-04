"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Loader2 } from "lucide-react";
import { updateSegmentScore } from "@/actions/scoreboard";
import { toast } from "sonner";
import type { SegmentScore } from "@/types/scoreboard";

interface ScoreEditorProps {
  matchId: string;
  segment: SegmentScore;
  onSuccess?: () => void;
}

export function ScoreEditor({ matchId, segment, onSuccess }: ScoreEditorProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [homeScore, setHomeScore] = useState(segment.home_score);
  const [awayScore, setAwayScore] = useState(segment.away_score);
  const [finished, setFinished] = useState(segment.finished);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      await updateSegmentScore(matchId, {
        segment_number: segment.segment_number,
        home_score: homeScore,
        away_score: awayScore,
        finished,
      });

      toast.success("Placar atualizado com sucesso!");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar placar:", error);
      toast.error("Erro ao atualizar placar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Editar Placar - {segment.segment_number}º Tempo
            </DialogTitle>
            <DialogDescription>
              Atualize o placar deste período. As alterações serão transmitidas em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="home-score">Casa</Label>
                <Input
                  id="home-score"
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="away-score">Visitante</Label>
                <Input
                  id="away-score"
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="finished"
                checked={finished}
                onCheckedChange={(checked) => setFinished(checked as boolean)}
                disabled={isLoading}
              />
              <Label
                htmlFor="finished"
                className="text-sm font-normal cursor-pointer"
              >
                Período finalizado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
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
