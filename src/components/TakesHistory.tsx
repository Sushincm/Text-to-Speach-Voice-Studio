import React from 'react';
import { History, Play, Trash2, Download } from 'lucide-react';
import { AudioTake } from '../types';
import { downloadWavFile } from '../utils/audioUtils';

interface TakesHistoryProps {
  takes: AudioTake[];
  activeTakeId: string | null;
  onSelectTake: (take: AudioTake) => void;
  onDeleteTake: (takeId: string) => void;
  onClearAll: () => void;
}

export const TakesHistory: React.FC<TakesHistoryProps> = ({
  takes,
  activeTakeId,
  onSelectTake,
  onDeleteTake,
  onClearAll,
}) => {
  if (takes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
            Generated Takes ({takes.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors font-mono cursor-pointer"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {takes.map((take) => {
          const isActive = take.id === activeTakeId;
          const timeStr = new Date(take.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={take.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                isActive
                  ? 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-400 shadow-xs'
                  : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                    {take.title}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 shrink-0 text-[10px]">
                    {take.duration ? `${take.duration.toFixed(1)}s` : ''} • {timeStr}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                  {take.text}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono pt-0.5">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {take.studioTone === 'zack-d' ? '🎬 Zack D.' : take.studioTone === 'broadcast' ? '📻 News' : take.studioTone === 'viral-shorts' ? '⚡ Shorts' : '🎙️ Journey-D'}
                  </span>
                  <span>•</span>
                  <span>{take.speed.toFixed(2)}x</span>
                  <span>•</span>
                  <span>{take.pitch > 0 ? `+${take.pitch.toFixed(1)}` : take.pitch.toFixed(1)}st</span>
                  <span>•</span>
                  <span>+{(take.volumeGainDb ?? 1.5).toFixed(1)}dB</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onSelectTake(take)}
                  className="flex items-center gap-1.5 text-xs text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white font-semibold font-mono transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Load Take</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => downloadWavFile(take.audioUrl, `take-${take.id}.wav`)}
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Export WAV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTake(take.id)}
                    className="p-1 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
