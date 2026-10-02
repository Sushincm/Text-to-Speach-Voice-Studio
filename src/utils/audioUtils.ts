import { StudioTone } from '../types';

export interface TonePresetConfig {
  id: StudioTone;
  name: string;
  badge: string;
  description: string;
  defaultSpeed: number;
  pitch: number;
  volumeGainDb: number;
  promptStyle: string;
}

export const STUDIO_TONE_CONFIGS: Record<StudioTone, TonePresetConfig> = {
  'zack-d': {
    id: 'zack-d',
    name: 'Zack D. Films (25-Yr Creator)',
    badge: '🎬 Viral Explainer',
    description: 'Youthful 25-yr male voice (Puck) with snappy curiosity hook, punchy explanatory delivery, and crisp presence',
    defaultSpeed: 1.20,
    pitch: 0.0,
    volumeGainDb: 2.0,
    promptStyle: 'Fast-paced, punchy, high-retention 25-year-old YouTube Shorts explainer voice in the signature Zack D. Films style with crisp diction, gripping curiosity hook, dramatic pauses, and engaging pacing',
  },
  'narrative': {
    id: 'narrative',
    name: 'Journey-D Classic',
    badge: '🎙️ Narrative',
    description: 'Smooth, natural documentary baritone with warm vocal harmonics and relaxed cadence',
    defaultSpeed: 1.00,
    pitch: 0.0,
    volumeGainDb: 1.0,
    promptStyle: 'Captivating male documentary storyteller with rich chest resonance, compelling narrative pacing, and warm engaging presence',
  },
  'viral-shorts': {
    id: 'viral-shorts',
    name: 'Viral Shorts Pacing',
    badge: '⚡ ≤30s High Energy',
    description: 'High energy, fast-paced retention flow designed to fit long scripts cleanly under 30 seconds',
    defaultSpeed: 1.35,
    pitch: 0.0,
    volumeGainDb: 2.0,
    promptStyle: 'Energetic, fast, engaging viral TikTok/Reels narration with crisp pacing and continuous forward momentum',
  },
  'broadcast': {
    id: 'broadcast',
    name: 'Broadcast Anchor',
    badge: '📻 News Desk',
    description: 'Authoritative, clear broadcast cadence with studio proximity effect and balanced neutral inflection',
    defaultSpeed: 1.10,
    pitch: -0.3,
    volumeGainDb: 1.5,
    promptStyle: 'Professional broadcast news anchor delivering authoritative, articulate, and clear breaking news narration',
  },
  'custom': {
    id: 'custom',
    name: 'Custom Calibration',
    badge: '🎛️ Manual DSP',
    description: 'Fully customized manual slider calibrations for rate, pitch, and acoustic gain',
    defaultSpeed: 1.00,
    pitch: 0.0,
    volumeGainDb: 1.0,
    promptStyle: 'Professional studio voice artist with clean articulation',
  },
};

/**
 * Calculates estimated story duration based on word count, punctuation pauses, and speed multiplier.
 * Standard storytelling read speed is approx 135 words per minute (2.25 words/sec).
 */
export function estimateStoryTiming(text: string, speedMultiplier = 1.0) {
  const clean = text.replace(/\[.*?\]/g, '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  const chars = clean.length;

  const majorPauses = (clean.match(/[.!?]/g) || []).length;
  const minorPauses = (clean.match(/[,;:]/g) || []).length;

  const rawSecondsAt1x = words > 0 ? (words / 2.25) + (majorPauses * 0.35) + (minorPauses * 0.15) : 0;
  const totalSeconds = Number((rawSecondsAt1x / Math.max(0.5, speedMultiplier)).toFixed(1));

  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    words,
    chars,
    totalSeconds,
    rawSecondsAt1x: Number(rawSecondsAt1x.toFixed(1)),
    formatted,
    fitsIn30s: totalSeconds <= 30.0,
  };
}

/**
 * Auto-controls speed, pitch, and volume based on word count to fit within a 30s maximum duration.
 * Accurately calculates the exact speaking rate needed to finish in ~27.5-28.5 seconds.
 */
export function calculateAuto30sCalibration(text: string, tone: StudioTone = 'narrative') {
  const clean = text.replace(/\[.*?\]/g, '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  const toneConfig = STUDIO_TONE_CONFIGS[tone] || STUDIO_TONE_CONFIGS['narrative'];

  if (words === 0) {
    return {
      speed: toneConfig.defaultSpeed,
      pitch: toneConfig.pitch,
      volumeGainDb: toneConfig.volumeGainDb,
      words: 0,
      estimatedSecs: 0,
      rawDuration1x: 0,
      fitsIn30s: true,
      status: 'relaxed' as const,
      recommendation: 'Enter or paste story words to calculate 30s pacing',
    };
  }

  const majorPauses = (clean.match(/[.!?]/g) || []).length;
  const minorPauses = (clean.match(/[,;:]/g) || []).length;

  // Natural human storytelling pace (~135 words/min = 2.25 words/sec)
  const speakingTime = words / 2.25;
  const pauseTime = (majorPauses * 0.35) + (minorPauses * 0.15);
  const rawDuration1x = Number((speakingTime + pauseTime).toFixed(1));

  // Max duration is 30.0 seconds. Safe target is 28.0 seconds so audio never cuts off.
  const TARGET_SECONDS = 28.0;

  let speed = toneConfig.defaultSpeed;
  let status: 'relaxed' | 'optimal' | 'fast' | 'exceeds' = 'relaxed';
  let recommendation = '';

  const durationAtDefaultToneSpeed = rawDuration1x / toneConfig.defaultSpeed;

  if (durationAtDefaultToneSpeed <= TARGET_SECONDS) {
    speed = toneConfig.defaultSpeed;
    status = 'relaxed';
    recommendation = `Fits comfortably under 30s (${durationAtDefaultToneSpeed.toFixed(1)}s at ${speed}x ${toneConfig.name} pacing).`;
  } else {
    // Calculate required speed to compress into 28.0 seconds
    const neededSpeed = rawDuration1x / TARGET_SECONDS;
    if (neededSpeed <= 1.45) {
      speed = Number(neededSpeed.toFixed(2));
      status = 'optimal';
      recommendation = `Auto-calibrated to ${speed}x speed to fit ${words} words within 30s target (~28.0s).`;
    } else if (neededSpeed <= 1.85) {
      speed = Number(neededSpeed.toFixed(2));
      status = 'fast';
      recommendation = `Snappy ${speed}x pacing auto-applied to fit longer ${words}-word script into 30s.`;
    } else {
      speed = 1.85; // Preserves human voice clarity
      status = 'exceeds';
      recommendation = `Script is long (${words} words, ~${rawDuration1x}s at 1x). Auto-fit applied 1.85x speed limit (~${(rawDuration1x/1.85).toFixed(1)}s).`;
    }
  }

  const finalSpeed = Math.max(0.75, Math.min(2.0, Number(speed.toFixed(2))));
  const estimatedSecs = Number((rawDuration1x / finalSpeed).toFixed(1));
  const fitsIn30s = estimatedSecs <= 30.0;

  return {
    speed: finalSpeed,
    pitch: toneConfig.pitch,
    volumeGainDb: toneConfig.volumeGainDb,
    words,
    estimatedSecs,
    rawDuration1x,
    fitsIn30s,
    status,
    recommendation,
  };
}

/**
 * Triggers clean download of the generated audio WAV file
 */
export function downloadWavFile(audioUrl: string, filename = 'newscast-story.wav') {
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
