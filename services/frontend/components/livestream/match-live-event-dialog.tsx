"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchEventType } from "@/types/livestream";
import { publishMatchEvent } from "@/actions/lives";
import { getCompetitionStatsTypes, registerMatchScore } from "@/actions/matches";
import { getUsersPublicInfoBatch } from "@/actions/auth";
import { formatUserProfileDisplayName } from "@/lib/user-display-name";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CompetitionStat, TeamWithPlayers } from "@/types/competition";
import type { SegmentScore } from "@/types/scoreboard";
import type { StatsRuleSet } from "@/types/stats";

type Mode = "stat" | "custom";

interface MatchLiveEventDialogProps {
  liveId: string;
  matchId: string;
  competitionId: string;
  competitionStats: CompetitionStat[];
  matchData: {
    home_team_id?: string;
    away_team_id?: string;
  };
  teamsWithPlayers: TeamWithPlayers[];
  segments: SegmentScore[];
  canCreate: boolean;
  liveStatus: string;
}

export function MatchLiveEventDialog({
  liveId,
  matchId,
  competitionId,
  competitionStats,
  matchData,
  teamsWithPlayers,
  segments,
  canCreate,
  liveStatus,
}: MatchLiveEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [ruleset, setRuleset] = useState<StatsRuleSet | null>(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("custom");

  const [teamSide, setTeamSide] = useState<"home" | "away" | "">("");
  const [statAbbr, setStatAbbr] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [increment, setIncrement] = useState(1);
  const [minute, setMinute] = useState("");
  const [description, setDescription] = useState("");

  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [playerNameById, setPlayerNameById] = useState<Record<string, string>>({});
  /** Se true, soma `increment` ao placar; se false, só persiste métrica do jogador (backend exige ruleset). */
  const [alterPlacar, setAlterPlacar] = useState(false);

  const hasStats = competitionStats.length > 0;

  useEffect(() => {
    if (!open || !competitionId) return;
    setLoadingRules(true);
    getCompetitionStatsTypes(competitionId)
      .then((r) => setRuleset(r))
      .catch(() => setRuleset(null))
      .finally(() => setLoadingRules(false));
  }, [open, competitionId]);

  useEffect(() => {
    if (open) {
      setMode(hasStats && ruleset?.stats_types?.length ? "stat" : "custom");
    }
  }, [open, hasStats, ruleset]);

  const playersForSelectedTeam = useMemo(() => {
    if (!teamSide) return [];
    const tid = teamSide === "home" ? matchData.home_team_id : matchData.away_team_id;
    if (!tid) return [];
    return teamsWithPlayers.find((t) => t.id === tid)?.players ?? [];
  }, [teamSide, matchData.home_team_id, matchData.away_team_id, teamsWithPlayers]);

  useEffect(() => {
    if (!open || playersForSelectedTeam.length === 0) {
      setPlayerNameById({});
      return;
    }
    const keycloakIds = [
      ...new Set(
        playersForSelectedTeam
          .map((p) => String(p.keycloak_id ?? "").trim())
          .filter(Boolean)
      ),
    ];
    if (keycloakIds.length === 0) {
      setPlayerNameById({});
      return;
    }
    let cancelled = false;
    void getUsersPublicInfoBatch(keycloakIds).then((profiles) => {
      if (cancelled) return;
      const byKc = new Map<string, string>();
      for (const profile of profiles) {
        const kid = String(profile.keycloak_id ?? "").trim();
        if (kid) byKc.set(kid, formatUserProfileDisplayName(profile));
      }
      const map: Record<string, string> = {};
      for (const p of playersForSelectedTeam) {
        const kid = String(p.keycloak_id ?? "").trim();
        map[p.id] = byKc.get(kid) ?? "Jogador";
      }
      setPlayerNameById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [open, playersForSelectedTeam]);

  const teamLabel = (side: "home" | "away") => {
    const tid = side === "home" ? matchData.home_team_id : matchData.away_team_id;
    return teamsWithPlayers.find((t) => t.id === tid)?.name ?? (side === "home" ? "Casa" : "Visitante");
  };

  const reset = () => {
    setTeamSide("");
    setStatAbbr("");
    setPlayerId("");
    setSegmentId("");
    setIncrement(1);
    setMinute("");
    setDescription("");
    setCustomTitle("");
    setCustomDesc("");
    setAlterPlacar(false);
  };

  const submitStat = async () => {
    if (!teamSide) {
      toast.error("Selecione o time");
      return;
    }
    if (!statAbbr || !playerId) {
      toast.error("Preencha métrica e jogador");
      return;
    }
    const st = ruleset?.stats_types.find((s) => s.abbreviation === statAbbr);
    const teamName = teamLabel(teamSide as "home" | "away");
    const playerDisplay = (playerId && playerNameById[playerId]) || "Jogador";

    setSubmitting(true);
    try {
      await publishMatchEvent(liveId, {
        type: MatchEventType.CUSTOM,
        payload: {
          statName: st?.name ?? statAbbr,
          playerName: playerDisplay,
          playerTeam: teamName,
          value: increment,
          minute: minute || undefined,
          description: description || undefined,
          alterPlacar,
        },
      });
      try {
        await registerMatchScore(matchId, {
          team_side: teamSide as "home" | "away",
          increment,
          segment_id: segmentId || undefined,
          stats_metric_abbreviation: statAbbr,
          player_id: playerId,
          update_scoreboard: alterPlacar,
        });
      } catch (scoreErr) {
        console.error(scoreErr);
        toast.warning("Evento registrado, mas não foi possível salvar no placar/estatísticas.", {
          description:
            scoreErr instanceof Error ? scoreErr.message : "Verifique permissões e se o jogo está ao vivo.",
        });
        reset();
        setOpen(false);
        return;
      }
      toast.success(
        alterPlacar
          ? "Evento registrado e placar atualizado."
          : "Evento registrado (placar inalterado; métrica do jogador salva)."
      );
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCustom = async () => {
    if (!customTitle.trim()) {
      toast.error("Informe o nome do evento");
      return;
    }
    setSubmitting(true);
    try {
      await publishMatchEvent(liveId, {
        type: MatchEventType.CUSTOM,
        payload: {
          title: customTitle.trim(),
          description: customDesc.trim() || undefined,
          minute: minute || undefined,
        },
      });
      toast.success("Evento registrado");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate || liveStatus !== "live") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
          <DialogDescription>
            {hasStats && ruleset?.stats_types?.length
              ? "Registre uma estatística ou um evento livre. Use a opção abaixo se este registro deve somar ao placar."
              : "Descreva o que aconteceu na partida."}
          </DialogDescription>
        </DialogHeader>

        {loadingRules ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {hasStats && ruleset && ruleset.stats_types.length > 0 && (
              <div className="flex flex-wrap gap-2 py-2">
                <Button
                  type="button"
                  variant={mode === "stat" ? "default" : "outline"}
                  size="sm"
                  className={mode === "stat" ? "bg-main hover:bg-main/90 text-white" : ""}
                  onClick={() => setMode("stat")}
                >
                  Estatística
                </Button>
                <Button
                  type="button"
                  variant={mode === "custom" ? "default" : "outline"}
                  size="sm"
                  className={mode === "custom" ? "bg-main hover:bg-main/90 text-white" : ""}
                  onClick={() => setMode("custom")}
                >
                  Evento personalizado
                </Button>
              </div>
            )}

            {mode === "stat" && ruleset && ruleset.stats_types.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={teamSide}
                    onValueChange={(v) => {
                      setTeamSide(v as "home" | "away");
                      setPlayerId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">{teamLabel("home")} (casa)</SelectItem>
                      <SelectItem value="away">{teamLabel("away")} (visitante)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={statAbbr} onValueChange={setStatAbbr}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleset.stats_types.map((s) => (
                        <SelectItem key={s.id} value={s.abbreviation}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jogador</Label>
                  <Select value={playerId} onValueChange={setPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {playersForSelectedTeam.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {playerNameById[p.id] ?? "Carregando nome…"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {segments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Período (opcional)</Label>
                    <Select value={segmentId} onValueChange={setSegmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todo o jogo" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.map((s) => (
                          <SelectItem key={s.segment_id} value={s.segment_id}>
                            {s.segment_number}º tempo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      min={1}
                      value={increment}
                      onChange={(e) => setIncrement(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minuto (opcional)</Label>
                    <Input value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="Ex: 42" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="alter-placar" className="text-sm font-medium">
                        Alterar placar
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marque para somar o valor ao placar do jogo. Desmarcado: só salva a métrica do jogador.
                      </p>
                    </div>
                    <Switch
                      id="alter-placar"
                      checked={alterPlacar}
                      onCheckedChange={setAlterPlacar}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Nome do evento</Label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Interrupção por chuva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Detalhes (opcional)</Label>
                  <Textarea
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minuto (opcional)</Label>
                  <Input value={minute} onChange={(e) => setMinute(e.target.value)} />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-main hover:bg-main/90 text-white"
                disabled={submitting}
                onClick={() => {
                  if (mode === "stat" && ruleset?.stats_types?.length) void submitStat();
                  else void submitCustom();
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
