"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Plus, Loader2, Trophy, AlertCircle } from "lucide-react";
import { 
  getCompetitionStatsTypes, 
  getCompetitionTeamsWithPlayers,
  registerMatchScore 
} from "@/actions/matches";
import { publishMatchEvent } from "@/actions/lives";
import { MatchEventType } from "@/types/livestream";
import type { StatsRuleSet, TeamWithPlayers } from "@/types/stats";
import type { SegmentScore } from "@/types/scoreboard";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StatsCreatorProps {
  matchId: string;
  competitionId: number;
  homeTeamId?: string;
  awayTeamId?: string;
  liveId?: string;
  segments?: SegmentScore[];
  onStatCreated?: () => void;
}

export function StatsCreator({ 
  matchId, 
  competitionId, 
  homeTeamId, 
  awayTeamId,
  liveId,
  segments = [],
  onStatCreated 
}: StatsCreatorProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dados da competição
  const [statsRuleSet, setStatsRuleSet] = useState<StatsRuleSet | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  
  // Form state
  const [teamSide, setTeamSide] = useState<"home" | "away" | "">("");
  const [selectedStatType, setSelectedStatType] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [increment, setIncrement] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [minute, setMinute] = useState<string>("");

  // Carrega dados quando abre o modal
  useEffect(() => {
    if (open && competitionId) {
      loadData();
    }
  }, [open, competitionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, teamsData] = await Promise.all([
        getCompetitionStatsTypes(competitionId),
        getCompetitionTeamsWithPlayers(competitionId),
      ]);
      
      setStatsRuleSet(statsData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da competição");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTeamSide("");
    setSelectedStatType("");
    setSelectedPlayerId("");
    setSelectedSegmentId("");
    setIncrement(1);
    setDescription("");
    setMinute("");
  };

  // Filtra jogadores pelo time selecionado
  const getPlayersForSelectedTeam = () => {
    if (!teamSide) return [];
    
    const targetTeamId = teamSide === "home" ? homeTeamId : awayTeamId;
    if (!targetTeamId) return [];
    
    const team = teams.find(t => t.id === targetTeamId);
    return team?.players || [];
  };

  // Obtém o nome do time selecionado
  const getTeamName = (side: "home" | "away") => {
    const targetTeamId = side === "home" ? homeTeamId : awayTeamId;
    if (!targetTeamId) return side === "home" ? "Casa" : "Visitante";
    
    const team = teams.find(t => t.id === targetTeamId);
    return team?.name || (side === "home" ? "Casa" : "Visitante");
  };

  // Formata o nome do segmento para exibição
  const formatSegmentLabel = (segment: SegmentScore) => {
    const typeMap: Record<string, string> = {
      'REGULAR': 'Tempo',
      'OVERTIME': 'Prorrogação',
      'PENALTY': 'Pênaltis',
      'TIME': 'Tempo',
      'SET': 'Set',
      'QUARTER': 'Quarter',
    };
    
    const typeName = typeMap[segment.segment_type.toUpperCase()] || segment.segment_type;
    return `${segment.segment_number}º ${typeName}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamSide) {
      toast.error("Selecione o time");
      return;
    }

    // Se tem statsRuleSet, precisa de stat type e player
    if (statsRuleSet) {
      if (!selectedStatType) {
        toast.error("Selecione o tipo de estatística");
        return;
      }
      if (!selectedPlayerId) {
        toast.error("Selecione o jogador");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Registra a pontuação no backend
      await registerMatchScore(matchId, {
        team_side: teamSide as "home" | "away",
        increment,
        stats_metric_abbreviation: selectedStatType || undefined,
        player_id: selectedPlayerId || undefined,
        segment_id: selectedSegmentId ? parseInt(selectedSegmentId) : undefined,
      });

      // 2. Publica evento na timeline se tiver liveId
      if (liveId && statsRuleSet && selectedStatType && selectedPlayerId) {
        const selectedStat = statsRuleSet.stats_types.find(s => s.abbreviation === selectedStatType);
        const player = getPlayersForSelectedTeam().find(p => p.id === selectedPlayerId);
        const teamName = getTeamName(teamSide as "home" | "away");

        const payload: Record<string, unknown> = {
          statId: selectedStat?.id,
          statName: selectedStat?.name,
          statAbbreviation: selectedStatType,
          playerId: selectedPlayerId,
          playerName: player?.name || `${player?.id.slice(0, 8)} - ${teamName}`,
          playerTeam: teamName,
          value: increment,
        };

        if (description) payload.description = description;
        if (minute) payload.minute = minute;
        
        if (selectedSegmentId) {
          const segment = segments.find(s => s.segment_id.toString() === selectedSegmentId);
          if (segment) {
            payload.segmentNumber = segment.segment_number;
            payload.segmentType = segment.segment_type;
          }
        }

        await publishMatchEvent(liveId, {
          type: MatchEventType.CUSTOM,
          payload,
        });
      }

      toast.success("Estatística registrada com sucesso!");
      resetForm();
      setOpen(false);
      onStatCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar estatística";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlayers = getPlayersForSelectedTeam();
  const hasStatsConfig = statsRuleSet && statsRuleSet.stats_types.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Registrar Stat
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Registrar Estatística
          </DialogTitle>
          <DialogDescription>
            Registre uma pontuação ou estatística na partida
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Seleção do Time */}
            <div className="space-y-2">
              <Label>Time *</Label>
              <Select value={teamSide} onValueChange={(v) => {
                setTeamSide(v as "home" | "away");
                setSelectedPlayerId(""); // Limpa jogador ao trocar time
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o time..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">
                    {getTeamName("home")} (Casa)
                  </SelectItem>
                  <SelectItem value="away">
                    {getTeamName("away")} (Visitante)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Estatística */}
            {hasStatsConfig && (
              <div className="space-y-2">
                <Label>Tipo de Estatística *</Label>
                <Select value={selectedStatType} onValueChange={setSelectedStatType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a métrica..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statsRuleSet.stats_types.map((stat) => (
                      <SelectItem key={stat.id} value={stat.abbreviation}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {stat.abbreviation}
                          </span>
                          <span>{stat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seleção do Jogador */}
            {hasStatsConfig && teamSide && (
              <div className="space-y-2">
                <Label>Jogador *</Label>
                {selectedPlayers.length === 0 ? (
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum jogador encontrado para este time.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o jogador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name || `Jogador ${player.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Valor/Incremento */}
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                min={1}
                value={increment}
                onChange={(e) => setIncrement(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade a adicionar (padrão: 1)
              </p>
            </div>

            {/* Seleção do Período/Segmento */}
            {segments.length > 0 && (
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período (opcional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment) => (
                      <SelectItem key={segment.segment_id} value={segment.segment_id.toString()}>
                        {formatSegmentLabel(segment)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva a estatística (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            {/* Minuto */}
            <div className="space-y-2">
              <Label htmlFor="minute">Minuto</Label>
              <Input
                id="minute"
                type="text"
                placeholder="Ex: 45', 90+2'"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {!hasStatsConfig && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta competição não possui estatísticas configuradas. 
                  Apenas o placar geral será atualizado.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
