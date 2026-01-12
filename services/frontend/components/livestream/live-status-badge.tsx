import { LiveStatus } from "@/types/livestream";
import { Badge } from "@/components/ui/badge";

interface LiveStatusBadgeProps {
  status: LiveStatus;
}

const statusConfig = {
  [LiveStatus.SCHEDULED]: {
    label: "Agendada",
    variant: "secondary" as const,
  },
  [LiveStatus.LIVE]: {
    label: "Ao Vivo",
    variant: "destructive" as const,
  },
  [LiveStatus.FINISHED]: {
    label: "Finalizada",
    variant: "outline" as const,
  },
  [LiveStatus.CANCELLED]: {
    label: "Cancelada",
    variant: "outline" as const,
  },
};

export function LiveStatusBadge({ status }: LiveStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="uppercase font-bold">
      {config.label}
    </Badge>
  );
}
