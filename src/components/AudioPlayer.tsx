import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, VolumeX } from 'lucide-react';
import { AudioTake } from '../types';
import { downloadWavFile } from '../utils/audioUtils';

interface AudioPlayerProps {
  take: AudioTake | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  take,
  isPlaying,
  onTogglePlay,
  onReset,
  audioRef,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  useEffect(() => {
    if (take) {
      setPlaybackRate(1);
      setDuration(take.duration || 0);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.defaultPlaybackRate = 1;
        audioRef.current.playbackRate = 1;
        (audioRef.current as any).preservesPitch = true;
      }
    }
  }, [take]);

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      (audioRef.current as any).preservesPitch = true;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!take) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-1.5 shadow-xs">
        <p className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">Audio Preview</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Generated story audio will be ready for playback and export here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono truncate max-w-sm">
            {take.title}
          </h3>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
            {take.duration ? `(${take.duration.toFixed(1)}s)` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={() => downloadWavFile(take.audioUrl, `newscast-${take.id}.wav`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Export WAV</span>
        </button>
      </div>

      {/* Progress scrubber */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Restart playback"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono">
            {[1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handlePlaybackRateChange(rate)}
                className={`px-2 py-0.5 rounded ${
                  playbackRate === rate
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400 dark:text-zinc-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={take.audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => onTogglePlay()}
        className="hidden"
      />
    </div>
  );
};
