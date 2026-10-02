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
 * Keeps pitch at 0.0 (natural human Journey-D sound) so the vocal tone is never altered or distorted.
 */
export function calculateAuto30sCalibration(text: string) {
  const clean = text.replace(/\[.*?\]/g, '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;

  if (words === 0) {
    return {
      speed: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
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

  // Natural human storytelling pace for Journey-D (~135 words/min = 2.25 words/sec)
  const speakingTime = words / 2.25;
  const pauseTime = (majorPauses * 0.35) + (minorPauses * 0.15);
  const rawDuration1x = Number((speakingTime + pauseTime).toFixed(1));

  // Max duration is 30.0 seconds. Target ~28.0 seconds for safety margin.
  const TARGET_SECONDS = 28.0;

  let speed = 1.0;
  let status: 'relaxed' | 'optimal' | 'fast' | 'exceeds' = 'relaxed';
  let recommendation = '';

  if (rawDuration1x <= TARGET_SECONDS) {
    // Fits comfortably in 30s at natural human speed (1.0x)
    speed = 1.0;
    status = 'relaxed';
    recommendation = `Fits comfortably in 30s (${rawDuration1x}s at natural 1.0x human pacing).`;
  } else {
    // Speed up just enough to fit within 28.0s
    const neededSpeed = rawDuration1x / TARGET_SECONDS;
    if (neededSpeed <= 1.45) {
      speed = Number(neededSpeed.toFixed(2));
      status = 'optimal';
      recommendation = `Auto-fit to ${speed}x speed to fit within 30s (~${TARGET_SECONDS}s).`;
    } else if (neededSpeed <= 1.85) {
      speed = Number(neededSpeed.toFixed(2));
      status = 'fast';
      recommendation = `Fast narrative pacing (${speed}x) auto-applied to fit ${words} words into 30s.`;
    } else {
      speed = 1.85; // Cap at 1.85x so human voice clarity is preserved
      status = 'exceeds';
      recommendation = `Story is long (${words} words, ~${rawDuration1x}s). Capped at 1.85x; consider trimming slightly to stay under 30s.`;
    }
  }

  const estimatedSecs = Number((rawDuration1x / speed).toFixed(1));
  const fitsIn30s = estimatedSecs <= 30.0;

  return {
    speed: Math.max(0.75, Math.min(2.0, speed)),
    pitch: 0.0, // Authentic natural Journey-D tone (0.0 st) - tone and sound remain untouched
    volumeGainDb: 1.0, // Clear broadcast level (+1.0 dB)
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
export function downloadWavFile(audioUrl: string, filename = 'journey-d-story.wav') {
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
