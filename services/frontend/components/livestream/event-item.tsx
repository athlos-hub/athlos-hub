import { MatchEventType } from "@/types/livestream";
import { 
  Goal, 
  AlertCircle, 
  CreditCard, 
  Users, 
  Play, 
  Square,
  Target,
  AlertTriangle,
  Video
} from "lucide-react";

interface EventItemProps {
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

const eventConfig: Record<MatchEventType, { icon: React.ElementType; label: string; color: string }> = {
  [MatchEventType.GOAL]: { icon: Goal, label: "Gol", color: "text-green-600" },
  [MatchEventType.FOUL]: { icon: AlertCircle, label: "Falta", color: "text-yellow-600" },
  [MatchEventType.YELLOW_CARD]: { icon: CreditCard, label: "Cartão Amarelo", color: "text-yellow-500" },
  [MatchEventType.RED_CARD]: { icon: CreditCard, label: "Cartão Vermelho", color: "text-red-600" },
  [MatchEventType.SUBSTITUTION]: { icon: Users, label: "Substituição", color: "text-blue-600" },
  [MatchEventType.PERIOD_START]: { icon: Play, label: "Início do Período", color: "text-green-500" },
  [MatchEventType.PERIOD_END]: { icon: Square, label: "Fim do Período", color: "text-gray-600" },
  [MatchEventType.PENALTY]: { icon: Target, label: "Pênalti", color: "text-purple-600" },
  [MatchEventType.OWN_GOAL]: { icon: AlertTriangle, label: "Gol Contra", color: "text-orange-600" },
  [MatchEventType.VAR_REVIEW]: { icon: Video, label: "Revisão VAR", color: "text-indigo-600" },
};

export function EventItem({ type, payload, timestamp }: EventItemProps) {
  const config = eventConfig[type];
  const Icon = config.icon;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className={`shrink-0 ${config.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`font-semibold text-sm ${config.color}`}>{config.label}</h4>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(timestamp)}
          </span>
        </div>
        {Object.keys(payload).length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {Object.entries(payload).map(([key, value]) => (
              <div key={key} className="flex gap-1">
                <span className="font-medium">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
