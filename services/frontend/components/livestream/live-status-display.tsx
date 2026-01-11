import { Clock, PlayCircle, StopCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveStatus } from "@/types/livestream";

interface LiveStatusDisplayProps {
  status: LiveStatus;
  startedAt?: string | null;
  endedAt?: string | null;
}

export function LiveStatusDisplay({ status, startedAt, endedAt }: LiveStatusDisplayProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "scheduled":
        return {
          icon: Clock,
          title: "Aguardando Transmissão",
          description: "A live foi criada e está aguardando o início da transmissão.",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          iconColor: "text-blue-600 dark:text-blue-400",
          textColor: "text-blue-900 dark:text-blue-100",
        };
      case "live":
        return {
          icon: PlayCircle,
          title: "Transmissão ao Vivo",
          description: "A transmissão está ativa e sendo transmitida para os espectadores.",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800",
          iconColor: "text-red-600 dark:text-red-400",
          textColor: "text-red-900 dark:text-red-100",
          pulse: true,
        };
      case "finished":
        return {
          icon: StopCircle,
          title: "Transmissão Finalizada",
          description: "A live foi encerrada. O vídeo não está mais disponível para visualização.",
          bgColor: "bg-gray-50 dark:bg-gray-950/20",
          borderColor: "border-gray-200 dark:border-gray-800",
          iconColor: "text-gray-600 dark:text-gray-400",
          textColor: "text-gray-900 dark:text-gray-100",
        };
      case "cancelled":
        return {
          icon: XCircle,
          title: "Transmissão Cancelada",
          description: "Esta live foi cancelada e não chegou a ser transmitida.",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          iconColor: "text-orange-600 dark:text-orange-400",
          textColor: "text-orange-900 dark:text-orange-100",
        };
      default:
        return {
          icon: Clock,
          title: "Status Desconhecido",
          description: "",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          iconColor: "text-gray-600",
          textColor: "text-gray-900",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`${config.pulse ? 'animate-pulse' : ''}`}>
            <Icon className={`w-12 h-12 ${config.iconColor}`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className={`text-xl font-bold ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} opacity-80`}>
              {config.description}
            </p>

            {startedAt && (
              <div className={`text-xs ${config.textColor} opacity-60 pt-2`}>
                Iniciada em: {formatDateTime(startedAt)}
              </div>
            )}
            {endedAt && (
              <div className={`text-xs ${config.textColor} opacity-60`}>
                Finalizada em: {formatDateTime(endedAt)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
