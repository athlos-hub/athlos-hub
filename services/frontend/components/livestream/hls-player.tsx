"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";

interface HLSPlayerProps {
  streamKey: string;
  isLive: boolean;
  autoPlay?: boolean;
}

function buildHlsBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_HLS_URL || "https://athloshub.com.br";
  return raw.endsWith("/live") ? raw : `${raw}/live`;
}


export function HLSPlayer({ streamKey, isLive, autoPlay = true }: HLSPlayerProps) {
  const hlsBasePath = useMemo(() => buildHlsBasePath(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const cleanupHls = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    cleanupHls();
    setError(null);
    setIsLoading(true);
    retryCountRef.current = 0;
    setRetryTrigger(prev => prev + 1);
  }, [cleanupHls]);

  useEffect(() => {
    if (!videoRef.current || !isLive) return;

    const video = videoRef.current;
    const streamUrl = `${hlsBasePath}/${streamKey}/index.m3u8`;

    const loadStream = (attempt: number = 0) => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Preferir hls.js em Chromium: alguns browsers reportam canPlayType(apple mpegurl) mas não reproduzem LL-HLS fmp4.
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveDurationInfinity: true,
          // LL-HLS no MediaMTX: buffers menores reduzem latência e uso de memória
          backBufferLength: 30,
          liveBackBufferLength: 0,
          maxBufferLength: 12,
          maxMaxBufferLength: 24,
          liveSyncDurationCount: 3,
          startLevel: -1,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 10000,
          fragLoadingTimeOut: 20000,
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setError(null);
          retryCountRef.current = 0;
          
          if (autoPlay) {
            video.play().catch((err) => {
              if (err.name === "NotAllowedError") {
                setError("Clique no vídeo para iniciar a reprodução");
              }
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (process.env.NODE_ENV === "development" && data.fatal) {
            console.warn("[HLS]", data.type, data.details, data.error);
          }
          if (!data.fatal) {
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (attempt < 10) {
                setError(`Aguardando transmissão iniciar... (${attempt + 1}/10)`);
                setIsLoading(true);
                
                hls.destroy();
                hlsRef.current = null;
                
                retryTimeoutRef.current = setTimeout(() => {
                  retryCountRef.current = attempt + 1;
                  loadStream(attempt + 1);
                }, 2000);
              } else {
                setError("Transmissão não disponível. Verifique se o OBS está transmitindo.");
                setIsLoading(false);
              }
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Recuperando reprodução...");
              hls.recoverMediaError();
              break;
              
            default:
              setError("Erro ao reproduzir stream. Clique para tentar novamente.");
              setIsLoading(false);
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        setIsLoading(false);

        if (autoPlay) {
          video.play().catch((err) => {
            if (err.name === "NotAllowedError") {
              setError("Clique no vídeo para iniciar a reprodução");
            } else {
              setError("Erro ao iniciar reprodução. Clique para tentar novamente.");
            }
          });
        }
      } else {
        setError("Seu navegador não suporta HLS");
        setIsLoading(false);
      }
    };

    loadStream(0);

    return () => {
      cleanupHls();
    };
  }, [streamKey, isLive, autoPlay, retryTrigger, cleanupHls, hlsBasePath]);

  if (!isLive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <p className="text-white text-lg">Aguardando início da transmissão...</p>
      </div>
    );
  }

  const handleVideoClick = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.paused) return;
    v.play()
      .then(() => setError(null))
      .catch(() => {
        /* autoplay / policy: utilizador pode precisar interagir de novo */
      });
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        muted={autoPlay}
        onClick={handleVideoClick}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 pointer-events-none">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-white text-sm">{error || "Carregando stream..."}</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center space-y-4 p-6">
            <div className="text-4xl">📺</div>
            <p className="text-white/80 text-sm max-w-xs">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
