"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

interface HLSPlayerProps {
  streamKey: string;
  isLive: boolean;
  autoPlay?: boolean;
}

const HLS_BASE_URL = process.env.NEXT_PUBLIC_HLS_URL || "https://athloshub.com.br";
const baseUrl = HLS_BASE_URL.endsWith('/live') ? HLS_BASE_URL : `${HLS_BASE_URL}/live`;


export function HLSPlayer({ streamKey, isLive, autoPlay = true }: HLSPlayerProps) {
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
    const streamUrl = `${baseUrl}/${streamKey}/index.m3u8`;
    
    console.log('=== DEBUG HLS ===');
    console.log('HLS_BASE_URL:', HLS_BASE_URL);
    console.log('Stream Key:', streamKey);
    console.log('URL completa:', streamUrl);

    const loadStream = (attempt: number = 0) => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
      } 
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
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

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('=== ERRO HLS ===');
          console.error('Fatal?', data.fatal);
          console.error('Type:', data.type);
          console.error('Details:', data.details);
          console.error('Error:', data.error);
          console.error('Response:', data.response);
          
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
      } else {
        setError("Seu navegador não suporta HLS");
        setIsLoading(false);
      }
    };

    loadStream(0);

    return () => {
      cleanupHls();
    };
  }, [streamKey, isLive, autoPlay, retryTrigger, cleanupHls]);

  if (!isLive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <p className="text-white text-lg">Aguardando início da transmissão...</p>
      </div>
    );
  }

  const handleVideoClick = useCallback(() => {
    if (videoRef.current && error?.includes("Clique")) {
      videoRef.current.play().then(() => {
        setError(null);
      }).catch(console.error);
    }
  }, [error]);

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
