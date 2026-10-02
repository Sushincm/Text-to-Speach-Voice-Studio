import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  RotateCcw,
  Volume2,
  Trash2,
  Code2,
  Copy,
  Check,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Lock,
  BarChart3,
} from 'lucide-react';
import { AudioTake, StoryPreset } from './types';
import { STORY_PRESETS } from './data/storyPresets';
import { JourneyVoiceHero } from './components/JourneyVoiceHero';
import { StoryPresets } from './components/StoryPresets';
import { SimpleControls } from './components/SimpleControls';
import { AudioPlayer } from './components/AudioPlayer';
import { TakesHistory } from './components/TakesHistory';
import { PasswordGate } from './components/PasswordGate';
import { ApiUsageAnalytics } from './components/ApiUsageAnalytics';
import { estimateStoryTiming, calculateAuto30sCalibration } from './utils/audioUtils';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'studio' | 'analytics'>('studio');

  // Authentication & Security State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Primary Story State (defaulted to Medieval Monks take)
  const [activePresetId, setActivePresetId] = useState<string>(STORY_PRESETS[0].id);
  const [story, setStory] = useState<string>(STORY_PRESETS[0].story);

  // Auto-Fit ≤ 30s Pacing State
  const [autoFit30s, setAutoFit30s] = useState<boolean>(true);

  // Custom Journey-D Tuners
  const initialCalib = calculateAuto30sCalibration(STORY_PRESETS[0].story);
  const [speed, setSpeed] = useState<number>(initialCalib.speed);
  const [pitch, setPitch] = useState<number>(0.0);
  const [volumeGainDb, setVolumeGainDb] = useState<number>(1.0);

  // Playback & Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [currentTake, setCurrentTake] = useState<AudioTake | null>(null);
  const [takes, setTakes] = useState<AudioTake[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // UI state
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timing = estimateStoryTiming(story, speed);

  // Check saved authentication on mount
  useEffect(() => {
    const savedToken =
      localStorage.getItem('newscast_studio_auth_token') ||
      sessionStorage.getItem('newscast_studio_auth_token');

    if (savedToken) {
      setAuthToken(savedToken);
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Load saved takes from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('journeyd_story_takes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTakes(parsed);
          setCurrentTake(parsed[0]);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save takes to local storage
  useEffect(() => {
    try {
      if (takes.length > 0) {
        localStorage.setItem('journeyd_story_takes', JSON.stringify(takes.slice(0, 10)));
      }
    } catch {
      // Ignore quota errors
    }
  }, [takes]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('newscast_studio_auth_token');
    sessionStorage.removeItem('newscast_studio_auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    showNotification('info', 'Studio locked.');
  };

  const handleStoryChange = (newText: string) => {
    setStory(newText);
    setActivePresetId('');
    if (autoFit30s && newText.trim()) {
      const calib = calculateAuto30sCalibration(newText);
      setSpeed(calib.speed);
      setPitch(0.0);
    }
  };

  const handleSelectStory = (preset: StoryPreset) => {
    setActivePresetId(preset.id);
    setStory(preset.story);
    if (autoFit30s) {
      const calib = calculateAuto30sCalibration(preset.story);
      setSpeed(calib.speed);
      setPitch(0.0);
      setVolumeGainDb(1.0);
    } else {
      if (preset.suggestedSpeed) setSpeed(preset.suggestedSpeed);
      if (preset.suggestedPitch !== undefined) setPitch(preset.suggestedPitch);
      if (preset.suggestedVolumeGainDb !== undefined) setVolumeGainDb(preset.suggestedVolumeGainDb);
    }
    showNotification('info', `Loaded preset: ${preset.title}`);
  };

  const handleResetDefaults = () => {
    setSpeed(1.0);
    setPitch(0.0);
    setVolumeGainDb(0.0);
    showNotification('info', 'Reset voice settings to defaults.');
  };

  const handlePolishStory = async () => {
    if (!story.trim()) return;
    setIsPolishing(true);
    try {
      const res = await fetch('/api/story/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ text: story }),
      });

      if (res.status === 401) {
        handleLogout();
        showNotification('error', 'Session expired. Please log in.');
        return;
      }

      const data = await res.json();
      if (data.polishedText) {
        setStory(data.polishedText);
        if (autoFit30s) {
          const calib = calculateAuto30sCalibration(data.polishedText);
          setSpeed(calib.speed);
          setPitch(0.0);
        }
        showNotification('success', 'Script polished for audio narration.');
      }
    } catch (err: unknown) {
      showNotification('error', 'Could not polish script.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleGenerate = async () => {
    if (!story.trim()) {
      showNotification('error', 'Please enter some story text first.');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          text: story,
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Journey-D',
            ssmlGender: 'MALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed,
            pitch: pitch,
            volumeGainDb: volumeGainDb,
          },
          speed,
          pitch,
          volumeGainDb,
        }),
      });

      if (res.status === 401) {
        handleLogout();
        showNotification('error', 'Session expired. Please re-enter password.');
        return;
      }

      const data = await res.json();

      if (data.success && data.audioDataUrl) {
        const titleMatch = story.trim().split('\n')[0].replace(/[#*]/g, '').slice(0, 36);
        const newTake: AudioTake = {
          id: `take-${Date.now()}`,
          timestamp: Date.now(),
          title: titleMatch ? `${titleMatch}...` : 'Story Audio Take',
          text: story,
          audioUrl: data.audioDataUrl,
          duration: data.duration || 0,
          speed,
          pitch,
          volumeGainDb,
        };

        setCurrentTake(newTake);
        setTakes((prev) => [newTake, ...prev]);

        if (audioRef.current) {
          audioRef.current.src = data.audioDataUrl;
          audioRef.current.defaultPlaybackRate = 1.0;
          audioRef.current.playbackRate = 1.0;
          (audioRef.current as any).preservesPitch = true;
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }

        showNotification('success', 'Voice take generated successfully.');
      } else {
        const err = data.error || 'Failed to generate audio';
        showNotification('error', err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audio generation failed';
      showNotification('error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    if (!audioRef.current || !currentTake) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleResetPlayback = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleSelectTake = (take: AudioTake) => {
    setCurrentTake(take);
    if (audioRef.current) {
      audioRef.current.src = take.audioUrl;
      audioRef.current.defaultPlaybackRate = 1.0;
      audioRef.current.playbackRate = 1.0;
      (audioRef.current as any).preservesPitch = true;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleDeleteTake = (id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id));
    if (currentTake?.id === id) {
      setCurrentTake(null);
      setIsPlaying(false);
    }
    showNotification('info', 'Take deleted.');
  };

  const handleClearAllTakes = () => {
    setTakes([]);
    setCurrentTake(null);
    setIsPlaying(false);
    localStorage.removeItem('journeyd_story_takes');
    showNotification('info', 'All takes cleared.');
  };

  const journeyJsonConfig = {
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Journey-D',
      ssmlGender: 'MALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: speed,
      pitch: pitch,
      volumeGainDb: volumeGainDb,
    },
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (currentView === 'analytics') {
    return (
      <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col antialiased relative">
        {!isAuthenticated && (
          <PasswordGate
            onAuthenticated={(token) => {
              setAuthToken(token);
              setIsAuthenticated(true);
              showNotification('success', 'Studio unlocked.');
            }}
          />
        )}
        <ApiUsageAnalytics
          onBackToStudio={() => setCurrentView('studio')}
          authToken={authToken}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col antialiased selection:bg-zinc-200 selection:text-zinc-900 relative">
      {/* Password Gatekeeper */}
      {!isAuthenticated && (
        <PasswordGate
          onAuthenticated={(token) => {
            setAuthToken(token);
            setIsAuthenticated(true);
            showNotification('success', 'Studio unlocked.');
          }}
        />
      )}

      {/* Minimal Toast Notification */}
      {notification && (
        <div className="fixed top-3 right-3 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono shadow-lg backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-white border-zinc-200 text-zinc-900'
                : notification.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-zinc-200 text-zinc-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ) : null}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* ElevenLabs Style Clean Top Navigation */}
      <header className="border-b border-zinc-200/90 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-mono text-xs font-bold">
              N
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 tracking-tight">
                Newscast Studio
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                Private
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView('analytics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-mono transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Usage & Quota</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-mono transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                title="Lock Studio"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* 1. Voice Profile Header */}
        <JourneyVoiceHero
          onOpenConfig={() => setShowJsonModal(true)}
          speed={speed}
          pitch={pitch}
          volumeGainDb={volumeGainDb}
        />

        {/* 2. Sample Presets */}
        <StoryPresets
          onSelectStory={handleSelectStory}
          activePresetId={activePresetId}
          disabled={isGenerating}
        />

        {/* 3. Story Editor */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 space-y-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 font-mono">
              Script Text
            </span>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span>{timing.words} words</span>
              <span>•</span>
              <span>~{timing.formatted}</span>
              <button
                type="button"
                onClick={handlePolishStory}
                disabled={isPolishing || !story.trim() || isGenerating}
                className="text-zinc-900 hover:text-black font-medium transition-colors text-[11px] underline underline-offset-2 disabled:opacity-40 cursor-pointer"
              >
                {isPolishing ? 'Polishing...' : 'Polish Flow'}
              </button>
              <button
                type="button"
                onClick={() => setStory('')}
                disabled={!story.trim() || isGenerating}
                className="text-zinc-400 hover:text-zinc-700 transition-colors text-[11px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={story}
            onChange={(e) => handleStoryChange(e.target.value)}
            disabled={isGenerating}
            placeholder="Type or paste your narration script here..."
            rows={7}
            className="w-full bg-zinc-50/60 border border-zinc-200 rounded-xl p-3.5 text-zinc-900 text-sm leading-relaxed placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white font-normal resize-y transition-all"
          />
        </section>

        {/* 4. Acoustic Calibration Controls */}
        <SimpleControls
          speed={speed}
          pitch={pitch}
          volumeGainDb={volumeGainDb}
          onSpeedChange={(newSpeed) => setSpeed(newSpeed)}
          onPitchChange={(newPitch) => setPitch(newPitch)}
          onVolumeGainDbChange={(newGain) => setVolumeGainDb(newGain)}
          onResetDefaults={handleResetDefaults}
          storyText={story}
          autoFitEnabled={autoFit30s}
          onToggleAutoFit={setAutoFit30s}
          disabled={isGenerating}
        />

        {/* 5. Master Generate Action Button (ElevenLabs Clean Dark Primary Button) */}
        <div>
          <button
            type="button"
            disabled={isGenerating || !story.trim()}
            onClick={handleGenerate}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold font-mono text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              isGenerating || !story.trim()
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-black text-white active:scale-[0.99]'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Synthesizing Voice Narration...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Generate Story Voice with Journey-D</span>
              </>
            )}
          </button>
        </div>

        {/* 6. Audio Player */}
        <AudioPlayer
          take={currentTake}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onReset={handleResetPlayback}
          audioRef={audioRef}
        />

        {/* 7. Recent Takes Archive */}
        <TakesHistory
          takes={takes}
          activeTakeId={currentTake?.id || null}
          onSelectTake={handleSelectTake}
          onDeleteTake={handleDeleteTake}
          onClearAll={handleClearAllTakes}
        />

        {/* Under Studio Action Button: View API Quota */}
        <div className="pt-2 pb-2 text-center">
          <button
            type="button"
            onClick={() => setCurrentView('analytics')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-mono transition-colors cursor-pointer shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
            <span>View API Usage, Daily Remaining Quota & Bar Diagram</span>
          </button>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-200 py-4 px-6 text-center text-xs text-zinc-400 font-mono">
        Newscast Voice Studio • Google Gemini TTS Architecture
      </footer>

      {/* Config JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/30 backdrop-blur-sm">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-sm font-semibold text-zinc-900 font-mono">
                Voice Configuration JSON
              </span>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-800 overflow-x-auto">
{JSON.stringify(journeyJsonConfig, null, 2)}
              </pre>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(journeyJsonConfig, null, 2));
                  setCopiedJson(true);
                  setTimeout(() => setCopiedJson(false), 2000);
                }}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-zinc-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-zinc-700 hover:bg-zinc-100 transition-colors font-mono cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
