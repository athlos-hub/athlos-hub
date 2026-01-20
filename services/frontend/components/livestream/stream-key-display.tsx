"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface StreamKeyDisplayProps {
  streamKey: string;
}

export function StreamKeyDisplay({ streamKey }: StreamKeyDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const streamKeyDisplay = streamKey;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(streamKeyDisplay);
      setCopied(true);
      toast.success("Stream key copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) { 
      toast.error("Erro ao copiar stream key");
    }
  };

  const maskedKey = streamKey.substring(0, 8) + "•".repeat(streamKey.length - 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🔑 Stream Key
        </CardTitle>
        <CardDescription>
          Use esta chave no OBS para conectar à transmissão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Chave de Transmissão
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm break-all">
              {isVisible ? streamKeyDisplay : maskedKey}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsVisible(!isVisible)}
              title={isVisible ? "Ocultar" : "Mostrar"}
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copiar"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            URL do Servidor RTMP
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm">
              rtmp://localhost:1935/live
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText("rtmp://localhost:1935/live");
                  toast.success("URL copiada!");
                } catch (error) {
                  toast.error("Erro ao copiar URL");
                }
              }}
              title="Copiar URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            📺 Configuração no OBS Studio:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
            <li>Vá em <strong>Configurações → Transmissão</strong></li>
            <li>Serviço: <strong>Personalizado</strong></li>
            <li>Servidor: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">rtmp://localhost:1935/live</code></li>
            <li>Chave de Transmissão: <em>Cole a stream key acima</em></li>
            <li>Clique em <strong>Iniciar Transmissão</strong></li>
          </ol>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
            ⚠️ Atenção:
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            Não compartilhe sua stream key com ninguém. Qualquer pessoa com esta chave pode transmitir para sua live.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
