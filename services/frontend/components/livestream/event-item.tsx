import { MatchEventType } from "@/types/livestream";
import { 
  Trophy,
  Clock,
  Timer,
  Users,
  AlertTriangle,
  ShieldAlert,
  UserX,
  Video,
  HeartPulse,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventItemProps {
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

const eventConfig: Record<MatchEventType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  [MatchEventType.SCORE]: { 
    icon: Trophy, 
    label: "Pontuação", 
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900"
  },
  [MatchEventType.PERIOD_START]: { 
    icon: Clock, 
    label: "Início", 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-900"
  },
  [MatchEventType.PERIOD_END]: { 
    icon: Clock, 
    label: "Fim", 
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-800"
  },
  [MatchEventType.TIMEOUT]: { 
    icon: Timer, 
    label: "Tempo", 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900"
  },
  [MatchEventType.SUBSTITUTION]: { 
    icon: Users, 
    label: "Substituição", 
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900"
  },
  [MatchEventType.FOUL]: { 
    icon: AlertTriangle, 
    label: "Falta", 
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-900"
  },
  [MatchEventType.WARNING]: { 
    icon: ShieldAlert, 
    label: "Advertência", 
    color: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-300 dark:border-amber-800"
  },
  [MatchEventType.EJECTION]: { 
    icon: UserX, 
    label: "Expulsão", 
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-900"
  },
  [MatchEventType.REVIEW]: { 
    icon: Video, 
    label: "Revisão", 
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-900"
  },
  [MatchEventType.INJURY]: { 
    icon: HeartPulse, 
    label: "Lesão", 
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-900"
  },
  [MatchEventType.CUSTOM]: { 
    icon: MessageSquare, 
    label: "Evento", 
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-900"
  },
};

function formatEventDescription(type: MatchEventType, payload: Record<string, unknown>): React.ReactNode {
  const minute = payload.minute as string | number | undefined;
  const minuteStr = minute ? `${minute}'` : null;
  
  switch (type) {
    case MatchEventType.SCORE: {
      const points = payload.points as number | undefined;
      const pointsStr = points && points > 1 ? `+${points}` : "";
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.team)} {pointsStr}
          </div>
          {payload.description ? (
            <div className="text-muted-foreground">{String(payload.description)}</div>
          ) : null}
        </div>
      );
    }
    
    case MatchEventType.PERIOD_START:
      return (
        <div className="font-semibold text-foreground">
          {String(payload.period)}
        </div>
      );
    
    case MatchEventType.PERIOD_END:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">{String(payload.period)}</div>
          {payload.score ? (
            <div className="text-muted-foreground">Placar: {String(payload.score)}</div>
          ) : null}
        </div>
      );
    
    case MatchEventType.TIMEOUT:
      return (
        <div className="space-y-0.5">
          {minuteStr && (
            <div className="font-semibold text-foreground">{minuteStr}</div>
          )}
          {payload.team ? (
            <div className="text-muted-foreground">{String(payload.team)}</div>
          ) : null}
        </div>
      );
    
    case MatchEventType.SUBSTITUTION:
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-1">{minuteStr}</span>}
            <span className="text-red-500">{String(payload.playerOut)}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-green-500">{String(payload.playerIn)}</span>
          </div>
          {payload.team ? (
            <div className="text-muted-foreground">{String(payload.team)}</div>
          ) : null}
        </div>
      );
    
    case MatchEventType.FOUL:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.team)}
          </div>
          {payload.description ? (
            <div className="text-muted-foreground">{String(payload.description)}</div>
          ) : null}
        </div>
      );
    
    case MatchEventType.WARNING:
    case MatchEventType.EJECTION:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.player)}
          </div>
          <div className="text-muted-foreground">
            {payload.team ? <span>{String(payload.team)}</span> : null}
            {payload.team && payload.reason ? <span> - </span> : null}
            {payload.reason ? <span>{String(payload.reason)}</span> : null}
          </div>
        </div>
      );
    
    case MatchEventType.REVIEW:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.reason)}
          </div>
          {payload.decision ? (
            <div className="text-muted-foreground">Decisão: {String(payload.decision)}</div>
          ) : null}
        </div>
      );
    
    case MatchEventType.INJURY:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.player)}
          </div>
          <div className="text-muted-foreground">
            {payload.team ? <span>{String(payload.team)}</span> : null}
            {payload.team && payload.description ? <span> - </span> : null}
            {payload.description ? <span>{String(payload.description)}</span> : null}
          </div>
        </div>
      );
    
    case MatchEventType.CUSTOM:
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.title)}
          </div>
          {payload.description ? (
            <div className="text-muted-foreground">{String(payload.description)}</div>
          ) : null}
        </div>
      );
    
    default:
      if (Object.keys(payload).length === 0) return null;
      return (
        <div className="space-y-0.5">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="text-muted-foreground">
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      );
  }
}

export function EventItem({ type, payload, timestamp }: EventItemProps) {
  const config = eventConfig[type] || eventConfig[MatchEventType.CUSTOM];
  const Icon = config.icon;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const description = formatEventDescription(type, payload);

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-all",
      config.bgColor,
      config.borderColor,
      "hover:shadow-sm"
    )}>
      <div className={cn(
        "shrink-0 p-2 rounded-full",
        config.bgColor,
        "border",
        config.borderColor
      )}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn("text-xs font-bold uppercase tracking-wide", config.color)}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
            {formatTime(timestamp)}
          </span>
        </div>
        
        {description && (
          <div className="text-sm">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
