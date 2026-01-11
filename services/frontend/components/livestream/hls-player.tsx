"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HLSPlayerProps {
  streamKey: string;
  isLive: boolean;
  autoPlay?: boolean;
}

const HLS_BASE_URL = process.env.NEXT_PUBLIC_HLS_URL || "http://localhost:8888";

export function HLSPlayer({ streamKey, isLive, autoPlay = true }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!videoRef.current || !isLive) return;

    const video = videoRef.current;
    const streamUrl = `${HLS_BASE_URL}/live/${streamKey}/index.m3u8`;

    console.log("🎥 Tentando carregar HLS:", streamUrl);

    const loadStream = (attempt: number = 0) => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        if (autoPlay) {
          video.play().catch((err) => {
            console.error("Erro ao reproduzir vídeo:", err);
            setError("Erro ao iniciar reprodução");
          });
        }
        setIsLoading(false);
      } 
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1,
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("✅ HLS manifest carregado com sucesso");
          setIsLoading(false);
          setError(null);
          retryCountRef.current = 0;
          
          if (autoPlay) {
            video.play().catch((err) => {
              console.error("Erro ao reproduzir vídeo:", err);
              setError("Clique para iniciar a reprodução");
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (!data.fatal) {
            console.debug("⚠️  HLS Non-fatal error:", data.type, data.details);
            return;
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (attempt < 5) {
                  console.log(`🔄 Aguardando stream ficar disponível... (tentativa ${attempt + 1}/10)`);
                } else {
                  console.warn(`⚠️  Erro de rede persistente (tentativa ${attempt + 1}/10)`);
                }
                
                if (attempt < 10) {
                  setError(`Aguardando transmissão iniciar... (${attempt + 1}/10)`);
                  setIsLoading(true);
                  
                  hls.destroy();
                  
                  retryTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current = attempt + 1;
                    loadStream(attempt + 1);
                  }, 2000);
                } else {
                  console.error("❌ Stream não disponível após 10 tentativas");
                  setError("Transmissão ainda não iniciada. Inicie o OBS com a stream key configurada.");
                  setIsLoading(false);
                }
                break;
                
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("⚠️  Erro de mídia fatal, tentando recuperar...");
                setError("Recuperando reprodução...");
                hls.recoverMediaError();
                break;
                
              default:
                console.error("❌ Erro fatal desconhecido no HLS:", data.type);
                setError("Erro fatal ao reproduzir stream");
                setIsLoading(false);
                hls.destroy();
                break;
            }
          }
        });
      } else {
        setError("Seu navegador não suporta HLS");
        setIsLoading(false);
      }
    };

    loadStream(0);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamKey, isLive, autoPlay]);

  if (!isLive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <p className="text-white text-lg">Aguardando início da transmissão...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        muted={autoPlay}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-white text-sm">Carregando stream...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center space-y-2 p-6">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
