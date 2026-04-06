import { MatchEventType } from "@/types/livestream";
import { cn } from "@/lib/utils";

interface EventItemProps {
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

const typeLabels: Partial<Record<MatchEventType, string>> = {
  [MatchEventType.SCORE]: "Pontuação",
  [MatchEventType.PERIOD_START]: "Início de período",
  [MatchEventType.PERIOD_END]: "Fim de período",
  [MatchEventType.TIMEOUT]: "Tempo técnico",
  [MatchEventType.SUBSTITUTION]: "Substituição",
  [MatchEventType.FOUL]: "Falta",
  [MatchEventType.WARNING]: "Advertência",
  [MatchEventType.EJECTION]: "Expulsão",
  [MatchEventType.REVIEW]: "Revisão",
  [MatchEventType.INJURY]: "Lesão",
  [MatchEventType.CUSTOM]: "Evento",
};

function formatEventDescription(type: MatchEventType, payload: Record<string, unknown>): React.ReactNode {
  const minute = payload.minute as string | number | undefined;
  const minuteStr = minute != null && minute !== "" ? `${minute}'` : null;

  switch (type) {
    case MatchEventType.SCORE: {
      const points = payload.points as number | undefined;
      const pointsStr = points && points > 1 ? ` (+${points})` : "";
      return (
        <div className="space-y-0.5 text-sm">
          <div className="text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.team ?? "")}
            {pointsStr}
          </div>
          {payload.description ? (
            <div className="text-muted-foreground text-sm">{String(payload.description)}</div>
          ) : null}
        </div>
      );
    }
    case MatchEventType.CUSTOM: {
      if (payload.statName && payload.playerName) {
        const value = payload.value as number | undefined;
        const segmentInfo = payload.segmentNumber ? ` · ${payload.segmentNumber}º período` : "";
        return (
          <div className="space-y-0.5 text-sm">
            <div className="text-foreground">
              {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
              {String(payload.playerName)}
              {value != null && Number(value) > 1 ? ` (+${value})` : ""}
            </div>
            <div className="text-muted-foreground">
              {String(payload.statName ?? "")}
              {payload.playerTeam ? ` · ${String(payload.playerTeam)}` : ""}
              {segmentInfo}
            </div>
            {payload.description ? (
              <div className="text-muted-foreground text-xs">{String(payload.description)}</div>
            ) : null}
          </div>
        );
      }
      return (
        <div className="space-y-0.5 text-sm">
          <div className="text-foreground">
            {minuteStr && <span className="text-muted-foreground mr-2">{minuteStr}</span>}
            {String(payload.title ?? "")}
          </div>
          {payload.description ? (
            <div className="text-muted-foreground">{String(payload.description)}</div>
          ) : null}
        </div>
      );
    }
    default:
      if (Object.keys(payload).length === 0) return null;
      return (
        <div className="space-y-1 text-sm text-muted-foreground">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium text-foreground/80">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      );
  }
}

export function EventItem({ type, payload, timestamp }: EventItemProps) {
  const label =
    type === MatchEventType.CUSTOM && payload.statName
      ? String(payload.statName)
      : typeLabels[type] || "Evento";

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const description = formatEventDescription(type, payload);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card px-3 py-2.5 text-sm",
        "transition-colors hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {formatTime(timestamp)}
        </span>
      </div>
      {description && <div>{description}</div>}
    </div>
  );
}
