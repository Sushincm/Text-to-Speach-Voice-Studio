import React from 'react';
import { Code2, Mic, Flame } from 'lucide-react';
import { StudioTone } from '../types';
import { STUDIO_TONE_CONFIGS } from '../utils/audioUtils';

interface JourneyVoiceHeroProps {
  onOpenConfig: () => void;
  speed: number;
  pitch: number;
  volumeGainDb: number;
  studioTone: StudioTone;
  autoFit30s?: boolean;
}

export const JourneyVoiceHero: React.FC<JourneyVoiceHeroProps> = ({
  onOpenConfig,
  speed,
  pitch,
  volumeGainDb,
  studioTone,
  autoFit30s = true,
}) => {
  const toneConfig = STUDIO_TONE_CONFIGS[studioTone] || STUDIO_TONE_CONFIGS['narrative'];

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Voice Information */}
      <div className="flex items-start sm:items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
          studioTone === 'zack-d'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
        }`}>
          {studioTone === 'zack-d' ? <Flame className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              en-US-Journey-D
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              studioTone === 'zack-d'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}>
              {toneConfig.name} Tone
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              24kHz HD PCM
            </span>
            {autoFit30s && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50">
                ≤30s Auto-Paced
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span>Rate: <strong className="text-zinc-800 dark:text-zinc-200 font-medium">{speed.toFixed(2)}x</strong></span>
            <span>•</span>
            <span>Pitch: <strong className="text-zinc-800 dark:text-zinc-200 font-medium">{pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}st</strong></span>
            <span>•</span>
            <span>Gain: <strong className="text-zinc-800 dark:text-zinc-200 font-medium">+{volumeGainDb.toFixed(1)}dB</strong></span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-xs font-mono transition-colors cursor-pointer"
      >
        <Code2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>Voice Config</span>
      </button>
    </div>
  );
};
