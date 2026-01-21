"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { 
  Plus, 
  Loader2,
  Trophy,
  Clock,
  Timer,
  Users,
  AlertTriangle,
  ShieldAlert,
  UserX,
  Video,
  HeartPulse,
  MessageSquare
} from "lucide-react";

interface EventCreatorProps {
  liveId: string;
  onEventCreated?: () => void;
}

const eventTypeConfig: Record<MatchEventType, { 
  icon: React.ElementType; 
  label: string; 
  description: string;
  color: string;
  fields: Array<{ name: string; label: string; placeholder: string; required: boolean; type?: string }>;
}> = {
  [MatchEventType.SCORE]: { 
    icon: Trophy, 
    label: "Pontuação", 
    description: "Gol, ponto, cesta ou qualquer pontuação",
    color: "text-green-600",
    fields: [
      { name: "team", label: "Time/Atleta", placeholder: "Ex: Time A, João Silva", required: true },
      { name: "points", label: "Pontos", placeholder: "Ex: 1, 2, 3", required: false, type: "number" },
      { name: "description", label: "Descrição", placeholder: "Ex: Gol de cabeça, cesta de 3 pontos", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 45, 2º tempo", required: false },
    ]
  },
  [MatchEventType.PERIOD_START]: { 
    icon: Clock, 
    label: "Início de Período", 
    description: "Início de tempo, set, quarter, etc",
    color: "text-emerald-600",
    fields: [
      { name: "period", label: "Período", placeholder: "Ex: 1º Tempo, Set 1, 1º Quarter", required: true },
    ]
  },
  [MatchEventType.PERIOD_END]: { 
    icon: Clock, 
    label: "Fim de Período", 
    description: "Fim de tempo, set, quarter, etc",
    color: "text-slate-600",
    fields: [
      { name: "period", label: "Período", placeholder: "Ex: 1º Tempo, Set 1, 1º Quarter", required: true },
      { name: "score", label: "Placar", placeholder: "Ex: 2x1, 25-23", required: false },
    ]
  },
  [MatchEventType.TIMEOUT]: { 
    icon: Timer, 
    label: "Tempo Técnico", 
    description: "Timeout, pausa técnica",
    color: "text-blue-600",
    fields: [
      { name: "team", label: "Time", placeholder: "Quem pediu o tempo", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 10:30", required: false },
    ]
  },
  [MatchEventType.SUBSTITUTION]: { 
    icon: Users, 
    label: "Substituição", 
    description: "Troca de jogadores/atletas",
    color: "text-blue-500",
    fields: [
      { name: "team", label: "Time", placeholder: "Time", required: true },
      { name: "playerIn", label: "Entrou", placeholder: "Jogador que entrou", required: true },
      { name: "playerOut", label: "Saiu", placeholder: "Jogador que saiu", required: true },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 60", required: false },
    ]
  },
  [MatchEventType.FOUL]: { 
    icon: AlertTriangle, 
    label: "Falta", 
    description: "Falta, infração ou violação",
    color: "text-yellow-600",
    fields: [
      { name: "team", label: "Time/Atleta", placeholder: "Quem cometeu", required: true },
      { name: "description", label: "Descrição", placeholder: "Tipo de falta", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 30", required: false },
    ]
  },
  [MatchEventType.WARNING]: { 
    icon: ShieldAlert, 
    label: "Advertência", 
    description: "Cartão amarelo, falta técnica, warning",
    color: "text-amber-500",
    fields: [
      { name: "player", label: "Jogador/Atleta", placeholder: "Quem recebeu", required: true },
      { name: "team", label: "Time", placeholder: "Time", required: false },
      { name: "reason", label: "Motivo", placeholder: "Razão da advertência", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 45", required: false },
    ]
  },
  [MatchEventType.EJECTION]: { 
    icon: UserX, 
    label: "Expulsão", 
    description: "Cartão vermelho, desqualificação",
    color: "text-red-600",
    fields: [
      { name: "player", label: "Jogador/Atleta", placeholder: "Quem foi expulso", required: true },
      { name: "team", label: "Time", placeholder: "Time", required: false },
      { name: "reason", label: "Motivo", placeholder: "Razão da expulsão", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 78", required: false },
    ]
  },
  [MatchEventType.REVIEW]: { 
    icon: Video, 
    label: "Revisão", 
    description: "VAR, challenge, revisão de vídeo",
    color: "text-indigo-600",
    fields: [
      { name: "reason", label: "Motivo", placeholder: "O que está sendo revisado", required: true },
      { name: "decision", label: "Decisão", placeholder: "Resultado da revisão", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 52", required: false },
    ]
  },
  [MatchEventType.INJURY]: { 
    icon: HeartPulse, 
    label: "Lesão", 
    description: "Atendimento médico, lesão",
    color: "text-rose-600",
    fields: [
      { name: "player", label: "Jogador/Atleta", placeholder: "Quem se lesionou", required: true },
      { name: "team", label: "Time", placeholder: "Time", required: false },
      { name: "description", label: "Descrição", placeholder: "Tipo de lesão ou situação", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 35", required: false },
    ]
  },
  [MatchEventType.CUSTOM]: { 
    icon: MessageSquare, 
    label: "Evento Personalizado", 
    description: "Qualquer outro evento",
    color: "text-purple-600",
    fields: [
      { name: "title", label: "Título", placeholder: "Nome do evento", required: true },
      { name: "description", label: "Descrição", placeholder: "Detalhes do evento", required: false },
      { name: "minute", label: "Tempo/Minuto", placeholder: "Ex: 20", required: false },
    ]
  },
};

export function EventCreator({ liveId, onEventCreated }: EventCreatorProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MatchEventType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (value: string) => {
    setSelectedType(value as MatchEventType);
    setFormData({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const resetForm = () => {
    setSelectedType(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error("Selecione um tipo de evento");
      return;
    }

    const config = eventTypeConfig[selectedType];
    const requiredFields = config.fields.filter(f => f.required);
    
    for (const field of requiredFields) {
      if (!formData[field.name]?.trim()) {
        toast.error(`Campo "${field.label}" é obrigatório`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {};
      
      for (const field of config.fields) {
        if (formData[field.name]?.trim()) {
          if (field.type === "number") {
            const parsed = parseInt(formData[field.name], 10);
            if (!isNaN(parsed)) {
              payload[field.name] = parsed;
            }
          } else {
            payload[field.name] = formData[field.name].trim();
          }
        }
      }

      await publishMatchEvent(liveId, {
        type: selectedType,
        payload,
      });

      toast.success("Evento registrado!");
      resetForm();
      setOpen(false);
      onEventCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar evento";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConfig = selectedType ? eventTypeConfig[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Novo Evento
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Registrar Evento</DialogTitle>
          <DialogDescription>
            Registre um acontecimento importante da partida
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select value={selectedType || ""} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de evento..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(eventTypeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedConfig && (
              <p className="text-xs text-muted-foreground">
                {selectedConfig.description}
              </p>
            )}
          </div>

          {selectedConfig && (
            <div className="space-y-4 pt-2 border-t">
              {selectedConfig.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.name === "description" ? (
                    <Textarea
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="resize-none"
                      rows={2}
                    />
                  ) : (
                    <Input
                      type={field.type || "text"}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="bg-main hover:bg-main/90 text-white"
              disabled={isSubmitting || !selectedType}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Registrar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
