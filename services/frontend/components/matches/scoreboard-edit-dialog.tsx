"use client";

import { useState, useEffect } from "react";
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
import { Settings2, Loader2 } from "lucide-react";
import { updateSegmentScore } from "@/actions/scoreboard";
import { toast } from "sonner";
import type { SegmentScore } from "@/types/scoreboard";

function segmentLabel(segment: SegmentScore): string {
  if (segment.segment_type === "PENALTY") return "Pênaltis";
  if (segment.segment_type === "OVERTIME") return `Prorrogação ${segment.segment_number}`;
  return `${segment.segment_number}º período`;
}

interface ScoreboardEditDialogProps {
  matchId: string;
  segments: SegmentScore[];
  canEdit: boolean;
  onSaved?: () => void;
}

export function ScoreboardEditDialog({
  matchId,
  segments,
  canEdit,
  onSaved,
}: ScoreboardEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<
    Array<{ segment: SegmentScore; home: number; away: number; finished: boolean }>
  >([]);

  useEffect(() => {
    if (!open) return;
    setRows(
      segments.map((s) => ({
        segment: s,
        home: s.home_score,
        away: s.away_score,
        finished: s.finished,
      }))
    );
  }, [open, segments]);

  if (!canEdit || segments.length === 0) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const r of rows) {
        await updateSegmentScore(matchId, {
          segment_number: r.segment.segment_number,
          home_score: r.home,
          away_score: r.away,
          finished: r.finished,
        });
      }
      toast.success("Placar atualizado");
      setOpen(false);
      onSaved?.();
    } catch {
      toast.error("Não foi possível salvar o placar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Editar placar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar placar</DialogTitle>
          <DialogDescription>
            Ajuste os placares por período. As alterações são sincronizadas em tempo real.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[min(60vh,24rem)] overflow-y-auto py-2">
          {rows.map((r, idx) => (
            <div
              key={r.segment.segment_id}
              className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {segmentLabel(r.segment)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Casa</Label>
                  <Input
                    type="number"
                    min={0}
                    value={r.home}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 0;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, home: v } : x))
                      );
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Visitante</Label>
                  <Input
                    type="number"
                    min={0}
                    value={r.away}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 0;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, away: v } : x))
                      );
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`fin-${r.segment.segment_id}`}
                  checked={r.finished}
                  onCheckedChange={(c) =>
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, finished: Boolean(c) } : x
                      )
                    )
                  }
                />
                <Label htmlFor={`fin-${r.segment.segment_id}`} className="text-xs font-normal">
                  Período finalizado
                </Label>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-main hover:bg-main/90 text-white"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
