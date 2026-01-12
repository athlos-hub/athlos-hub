import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveStatusBadge } from "./live-status-badge";
import type { Live } from "@/types/livestream";
import { Calendar, Play } from "lucide-react";

interface LiveCardProps {
  live: Live;
}

export function LiveCard({ live }: LiveCardProps) {
  const formattedDate = live.startedAt
    ? new Date(live.startedAt).toLocaleString("pt-BR")
    : new Date(live.createdAt).toLocaleString("pt-BR");

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Live #{live.id.slice(0, 8)}</h3>
          <LiveStatusBadge status={live.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2 min-h-5">
            <span className="text-muted-foreground min-w-24 shrink-0">Partida:</span>
            <span className="font-medium break-all line-clamp-2">{live.externalMatchId}</span>
          </div>
          <div className="flex items-start gap-2 min-h-5">
            <span className="text-muted-foreground min-w-24 shrink-0">Organização:</span>
            <span className="font-medium break-all line-clamp-2">{live.organizationId}</span>
          </div>
          
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-1.5">
        <div className="w-full flex items-start gap-2 min-h-5">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-xs">{formattedDate}</span>
        </div>
        <Link href={`/jogos/${live.id}`} className="w-full">
          <Button className="w-full gap-2 cursor-pointer bg-main hover:bg-main/90 text-white">
            <Play className="w-4 h-4" />
            Acessar Live
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
