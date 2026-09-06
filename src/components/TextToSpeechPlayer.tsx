import React, { useState, useEffect } from "react";
import { Volume2, Play, Pause, Square, FastForward, X } from "lucide-react";

interface Props {
  textToRead: string;
  pageTitle?: string;
  onClose: () => void;
}

export const TextToSpeechPlayer: React.FC<Props> = ({
  textToRead,
  pageTitle,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(1);

  // Clean text for speech synthesis (strip markdown tags)
  const cleanText = textToRead
    .replace(/```[\s\S]*?```/g, " Code snippet omitted. ")
    .replace(/#+\s*/g, "")
    .replace(/[*_`~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();

  useEffect(() => {
    // Stop reading when unmounted or text changes
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [textToRead]);

  const handlePlay = () => {
    if (!window.speechSynthesis) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const toggleRate = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    if (isPlaying) {
      handleStop();
      setTimeout(handlePlay, 100);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#18181c] border border-amber-500/40 rounded-2xl p-3 sm:px-5 shadow-2xl flex items-center gap-3 sm:gap-4 text-xs text-slate-100 max-w-lg w-[92%] animate-in fade-in slide-in-from-bottom-4">
      <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
        <Volume2 className="w-5 h-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Audio Read Aloud</div>
        <div className="text-xs font-bold text-white truncate">{pageTitle || "Page Audio Content"}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="p-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xl font-bold cursor-pointer transition-transform active:scale-95"
            title="Pause Reading"
          >
            <Pause className="w-4 h-4 fill-slate-950" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="p-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xl font-bold cursor-pointer transition-transform active:scale-95"
            title="Start Reading Aloud"
          >
            <Play className="w-4 h-4 fill-slate-950" />
          </button>
        )}

        <button
          onClick={handleStop}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
          title="Stop Reading"
        >
          <Square className="w-3.5 h-3.5 fill-slate-300" />
        </button>

        <button
          onClick={toggleRate}
          className="px-2.5 py-1.5 bg-[#26262e] hover:bg-[#32323c] text-amber-400 border border-amber-500/30 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1"
          title="Adjust Speed"
        >
          <FastForward className="w-3 h-3" /> {rate}x
        </button>

        <button
          onClick={() => { handleStop(); onClose(); }}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
