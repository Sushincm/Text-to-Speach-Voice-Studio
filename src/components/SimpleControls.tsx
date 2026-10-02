import React from 'react';
import { Sliders, RotateCcw, Clock, Sparkles, Check, Flame, Radio, BookOpen, Volume2 } from 'lucide-react';
import { StudioTone } from '../types';
import {
  STUDIO_TONE_CONFIGS,
  calculateAuto30sCalibration,
  estimateStoryTiming,
} from '../utils/audioUtils';

interface SimpleControlsProps {
  speed: number;
  pitch: number;
  volumeGainDb: number;
  studioTone: StudioTone;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onVolumeGainDbChange: (gain: number) => void;
  onStudioToneChange: (tone: StudioTone) => void;
  onResetDefaults: () => void;
  storyText?: string;
  autoFitEnabled: boolean;
  onToggleAutoFit: (enabled: boolean) => void;
  disabled?: boolean;
}

export const SimpleControls: React.FC<SimpleControlsProps> = ({
  speed,
  pitch,
  volumeGainDb,
  studioTone,
  onSpeedChange,
  onPitchChange,
  onVolumeGainDbChange,
  onStudioToneChange,
  onResetDefaults,
  storyText = '',
  autoFitEnabled,
  onToggleAutoFit,
  disabled = false,
}) => {
  const autoCalib = calculateAuto30sCalibration(storyText, studioTone);
  const currentTiming = estimateStoryTiming(storyText, speed);

  const isDefault =
    studioTone === 'narrative' &&
    Math.abs(speed - 1.0) < 0.01 &&
    Math.abs(pitch - 0.0) < 0.05 &&
    Math.abs(volumeGainDb - 1.0) < 0.1 &&
    !autoFitEnabled;

  const handleSelectTone = (tone: StudioTone) => {
    onStudioToneChange(tone);
    if (tone !== 'custom') {
      const config = STUDIO_TONE_CONFIGS[tone];
      onPitchChange(config.pitch);
      onVolumeGainDbChange(config.volumeGainDb);

      if (autoFitEnabled && storyText.trim()) {
        const calib = calculateAuto30sCalibration(storyText, tone);
        onSpeedChange(calib.speed);
      } else {
        onSpeedChange(config.defaultSpeed);
      }
    }
  };

  const handleApplyAutoFit = () => {
    if (!autoFitEnabled) {
      onToggleAutoFit(true);
    }
    const calib = calculateAuto30sCalibration(storyText, studioTone);
    onSpeedChange(calib.speed);
    onPitchChange(calib.pitch);
    onVolumeGainDbChange(calib.volumeGainDb);
  };

  const tonesList: { id: StudioTone; icon: React.ReactNode; label: string; tag: string }[] = [
    {
      id: 'zack-d',
      icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
      label: 'Zack D. Films',
      tag: 'Viral Explainer',
    },
    {
      id: 'narrative',
      icon: <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
      label: 'Journey-D Classic',
      tag: 'Warm Story',
    },
    {
      id: 'viral-shorts',
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />,
      label: 'Viral Shorts',
      tag: '≤30s Fast Flow',
    },
    {
      id: 'broadcast',
      icon: <Radio className="w-3.5 h-3.5 text-purple-500" />,
      label: 'Broadcast Anchor',
      tag: 'News Studio',
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4 shadow-sm">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
            Studio Voice Mode & Pacing
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-Fit ≤ 30s Toggle Switch */}
          <button
            type="button"
            disabled={disabled || !storyText.trim()}
            onClick={() => {
              const next = !autoFitEnabled;
              onToggleAutoFit(next);
              if (next && storyText.trim()) {
                const calib = calculateAuto30sCalibration(storyText, studioTone);
                onSpeedChange(calib.speed);
                onPitchChange(calib.pitch);
                onVolumeGainDbChange(calib.volumeGainDb);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shadow-xs ${
              autoFitEnabled
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white border border-emerald-600 dark:border-emerald-500'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
            title="Automatically compute rate to guarantee under 30 seconds"
          >
            <Clock className={`w-3.5 h-3.5 ${autoFitEnabled ? 'animate-pulse' : ''}`} />
            <span>Auto-Fit ≤30s: {autoFitEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {!isDefault && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onToggleAutoFit(true);
                handleSelectTone('zack-d');
                onResetDefaults();
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-mono transition-colors px-2 py-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Studio Tone & Modulation Mode Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Studio Tone & Modulation Style (Free Tier)
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Instant acoustic coloring & resonance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {tonesList.map((t) => {
            const isSelected = studioTone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectTone(t.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/10 dark:ring-zinc-100/20'
                    : 'bg-zinc-50/70 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {t.icon}
                    <span className={`text-xs font-semibold ${isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {t.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-emerald-400 dark:text-emerald-700 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {t.tag}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Tone Explanation Banner */}
        <div className="text-[11px] font-mono px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {STUDIO_TONE_CONFIGS[studioTone]?.name || 'Custom'}:
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {STUDIO_TONE_CONFIGS[studioTone]?.description}
            </span>
          </div>
          {studioTone === 'zack-d' && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
              Shorts Hook Active
            </span>
          )}
        </div>
      </div>

      {/* 3. Live 30s Pacing & Duration Banner */}
      {storyText.trim() && (
        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
          currentTiming.totalSeconds <= 30.0
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <span>{currentTiming.words} words</span>
            <span>•</span>
            <span>Duration: <strong>~{currentTiming.totalSeconds}s</strong> at {speed.toFixed(2)}x</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {currentTiming.totalSeconds <= 30.0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Fits in 30s limit ({30.0 - currentTiming.totalSeconds > 0 ? `+${(30.0 - currentTiming.totalSeconds).toFixed(1)}s margin` : 'exact'})</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApplyAutoFit}
                className="underline font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
              >
                Auto-fit to {autoCalib.speed}x (~{autoCalib.estimatedSecs}s)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Fine-Tuning Acoustic Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
        {/* Speed */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-mono">Speaking Rate</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="2.00"
            step="0.01"
            value={speed}
            disabled={disabled}
            onChange={(e) => {
              onStudioToneChange('custom');
              onSpeedChange(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>0.75x</span>
            <span>1.0x (Natural)</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Pitch */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-mono">Pitch Resonance</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
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
            onChange={(e) => {
              onStudioToneChange('custom');
              onPitchChange(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>-3.0st (Deep)</span>
            <span>0.0 (Neutral)</span>
            <span>+3.0st</span>
          </div>
        </div>

        {/* Gain */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-mono">Studio Loudness Gain</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">+{volumeGainDb.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="4.0"
            step="0.5"
            value={volumeGainDb}
            disabled={disabled}
            onChange={(e) => {
              onStudioToneChange('custom');
              onVolumeGainDbChange(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>0 dB</span>
            <span>+2.0 dB (Zack D Punch)</span>
            <span>+4 dB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
