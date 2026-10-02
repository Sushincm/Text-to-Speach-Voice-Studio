import React from 'react';
import { Sliders, RotateCcw, Clock } from 'lucide-react';
import { calculateAuto30sCalibration, estimateStoryTiming } from '../utils/audioUtils';

interface SimpleControlsProps {
  speed: number;
  pitch: number;
  volumeGainDb: number;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onVolumeGainDbChange: (gain: number) => void;
  onResetDefaults: () => void;
  storyText?: string;
  autoFitEnabled?: boolean;
  onToggleAutoFit?: (enabled: boolean) => void;
  disabled?: boolean;
}

export const SimpleControls: React.FC<SimpleControlsProps> = ({
  speed,
  pitch,
  volumeGainDb,
  onSpeedChange,
  onPitchChange,
  onVolumeGainDbChange,
  onResetDefaults,
  storyText = '',
  disabled = false,
}) => {
  const isDefault =
    Math.abs(speed - 1.0) < 0.01 &&
    Math.abs(pitch - 0.0) < 0.05 &&
    Math.abs(volumeGainDb - 0.0) < 0.1;

  const autoCalib = calculateAuto30sCalibration(storyText);
  const currentTiming = estimateStoryTiming(storyText, speed);

  const handleApplyAutoFit = () => {
    onSpeedChange(autoCalib.speed);
    onPitchChange(0.0);
    onVolumeGainDbChange(1.0);
  };

  const isAutoSpeedActive = Math.abs(speed - autoCalib.speed) < 0.02 && Math.abs(pitch) < 0.05;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-zinc-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 font-mono">
            Voice Calibration
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || !storyText.trim()}
            onClick={handleApplyAutoFit}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              isAutoSpeedActive
                ? 'bg-zinc-900 text-white font-medium'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Auto-Fit ≤30s</span>
          </button>

          {!isDefault && (
            <button
              type="button"
              disabled={disabled}
              onClick={onResetDefaults}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 font-mono transition-colors px-2 py-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Pacing Info Banner */}
      {storyText.trim() && (
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-700">
            <span>{currentTiming.words} words</span>
            <span>•</span>
            <span>Est. duration: <strong className="text-zinc-900 font-medium">{currentTiming.totalSeconds}s</strong></span>
          </div>

          <div className="text-[11px] text-zinc-600">
            {currentTiming.totalSeconds <= 30.0 ? (
              <span className="text-emerald-700 font-medium">✓ Fits 30s target</span>
            ) : (
              <button
                type="button"
                onClick={handleApplyAutoFit}
                className="text-zinc-900 underline font-medium cursor-pointer"
              >
                Auto-fit to {autoCalib.speed}x (~{autoCalib.estimatedSecs}s)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Speed */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 font-mono">Speaking Rate</span>
            <span className="font-mono text-zinc-900 font-medium">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="2.00"
            step="0.01"
            value={speed}
            disabled={disabled}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
            <span>0.75x</span>
            <span>1.0x (Natural)</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Pitch */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 font-mono">Pitch Tuning</span>
            <span className="font-mono text-zinc-900 font-medium">
              {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)} st
            </span>
          </div>
          <input
            type="range"
            min="-3.0"
            max="3.0"
            step="0.1"
            value={pitch}
            disabled={disabled}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
            <span>-3.0st</span>
            <span>0.0 (Neutral)</span>
            <span>+3.0st</span>
          </div>
        </div>

        {/* Gain */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 font-mono">Volume Gain</span>
            <span className="font-mono text-zinc-900 font-medium">+{volumeGainDb.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="4.0"
            step="0.5"
            value={volumeGainDb}
            disabled={disabled}
            onChange={(e) => onVolumeGainDbChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
            <span>0 dB</span>
            <span>+1.5 dB (Studio)</span>
            <span>+4 dB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
