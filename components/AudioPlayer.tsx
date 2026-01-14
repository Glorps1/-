import React, { useState, useRef, useEffect } from 'react';
import { generateAudioExplanation } from '../services/geminiService';
import { Question } from '../types';
import { Play, Pause, Square, Loader2, Volume2, AlertCircle, Headphones, RotateCw } from 'lucide-react';

interface AudioPlayerProps {
  question: Question;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ question }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    stopAudio();
    audioBufferRef.current = null;
    setError(null);
  }, [question.id]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const processAudioData = (base64Data: string) => {
    const ctx = initAudioContext();
    const bytes = decodeBase64(base64Data);
    
    if (bytes.length % 2 !== 0) {
        const validLen = bytes.length - 1;
        const validBytes = bytes.slice(0, validLen);
        var dataInt16 = new Int16Array(validBytes.buffer);
    } else {
        var dataInt16 = new Int16Array(bytes.buffer);
    }

    const channelCount = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length;
    
    const buffer = ctx.createBuffer(channelCount, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    return buffer;
  };

  const playAudio = async () => {
    setError(null);
    const ctx = initAudioContext();
    
    // Resume context immediately on user click to satisfy mobile autoplay policies
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.error("Audio Context Resume failed", e);
        }
    }

    if (audioBufferRef.current) {
      startPlayback(audioBufferRef.current);
      return;
    }

    setLoading(true);
    try {
      const base64Data = await generateAudioExplanation(question);
      if (!base64Data) throw new Error("Empty audio data");
      const buffer = processAudioData(base64Data);
      audioBufferRef.current = buffer;
      startPlayback(buffer);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("API Key") || err.message.includes("403")) {
        setError("Нужен API ключ");
      } else {
        setError("Ошибка загрузки");
      }
    } finally {
      setLoading(false);
    }
  };

  const startPlayback = (buffer: AudioBuffer) => {
    const ctx = initAudioContext();
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      sourceNodeRef.current = null;
    };

    source.start();
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <div className={`rounded-2xl p-5 mb-6 flex items-center justify-between transition-all duration-300 shadow-md ${
        error 
        ? 'bg-red-50 border border-red-100' 
        : 'bg-gradient-to-br from-slate-900 to-slate-800 text-white'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${error ? 'bg-red-100 text-red-500' : 'bg-white/10 text-indigo-200'}`}>
            {error ? <AlertCircle className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
        </div>
        <div>
            <h3 className={`font-bold leading-tight ${error ? 'text-red-900' : 'text-white'}`}>
                {error ? "Ошибка" : "Аудио-разбор"}
            </h3>
            <p className={`text-sm mt-0.5 ${error ? 'text-red-700' : 'text-slate-300'}`}>
                {loading ? "Генерация..." : isPlaying ? "Воспроизведение..." : error || "Слушать краткую суть"}
            </p>
        </div>
      </div>

      <div>
        {loading ? (
            <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
        ) : isPlaying ? (
            <button 
                onClick={stopAudio}
                className="w-12 h-12 flex items-center justify-center bg-white text-slate-900 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
            >
                <Square className="w-4 h-4 fill-current" />
            </button>
        ) : (
            <button 
                onClick={playAudio}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${
                    error 
                    ? 'bg-red-200 text-red-500 hover:bg-red-300' 
                    : 'bg-indigo-500 hover:bg-indigo-400 text-white hover:scale-105 active:scale-95 shadow-indigo-900/30'
                }`}
                title={error ? "Попробуйте обновить страницу или проверить ключ" : "Воспроизвести"}
            >
                {error ? <RotateCw className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;