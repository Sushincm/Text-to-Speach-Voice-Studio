import React from 'react';
import { STORY_PRESETS } from '../data/storyPresets';
import { StoryPreset } from '../types';

interface StoryPresetsProps {
  onSelectStory: (preset: StoryPreset) => void;
  activePresetId?: string;
  disabled?: boolean;
}

export const StoryPresets: React.FC<StoryPresetsProps> = ({
  onSelectStory,
  activePresetId,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <span className="uppercase tracking-wider text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Sample Scripts</span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">1-click insert</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STORY_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectStory(preset)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer shadow-xs ${
                isActive
                  ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-mono ${isActive ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {preset.badge}
                </span>
                {isActive && (
                  <span className="text-[10px] font-mono text-emerald-400 dark:text-emerald-600 font-medium">Active</span>
                )}
              </div>
              <h4 className={`text-xs font-medium truncate ${isActive ? 'text-white dark:text-zinc-950 font-semibold' : 'text-zinc-900 dark:text-zinc-200'}`}>
                {preset.title}
              </h4>
            </button>
          );
        })}
      </div>
    </div>
  );
};
