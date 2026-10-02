import React from 'react';
import { Code2, Mic, Volume2 } from 'lucide-react';

interface JourneyVoiceHeroProps {
  onOpenConfig: () => void;
  speed: number;
  pitch: number;
  volumeGainDb: number;
}

export const JourneyVoiceHero: React.FC<JourneyVoiceHeroProps> = ({
  onOpenConfig,
  speed,
  pitch,
  volumeGainDb,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Voice Information */}
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0">
          <Mic className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 font-mono">
              en-US-Journey-D
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
              Narrative Storyteller
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
              24kHz HD PCM
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-mono">
            <span>Rate: <strong className="text-zinc-800 font-medium">{speed.toFixed(2)}x</strong></span>
            <span>•</span>
            <span>Pitch: <strong className="text-zinc-800 font-medium">{pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}st</strong></span>
            <span>•</span>
            <span>Gain: <strong className="text-zinc-800 font-medium">+{volumeGainDb.toFixed(1)}dB</strong></span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200 text-xs font-mono transition-colors cursor-pointer"
      >
        <Code2 className="w-3.5 h-3.5 text-zinc-500" />
        <span>Voice Config</span>
      </button>
    </div>
  );
};
