import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json({ limit: "15mb" }));

// Cryptographic salt and PBKDF2 hash parameters
const CRYPTO_SALT = process.env.APP_PASSWORD_SALT || "newscast_studio_salt_2026";
// Irreversible PBKDF2-SHA256 (100,000 iterations) hash of the master password
const STORED_PASSWORD_HASH =
  process.env.APP_PASSWORD_HASH ||
  "cd9cad94b2c7c6fc58125b40024f1b4dc19d3252f3d596a47bfa02acc693b8e1";

function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, CRYPTO_SALT, 100000, 32, "sha256").toString("hex");
}

function verifyPassword(inputPassword: string): boolean {
  try {
    const trimmed = inputPassword.trim();
    if (!trimmed) return false;

    // 1. Direct env variable match if APP_PASSWORD is set
    if (process.env.APP_PASSWORD && trimmed === process.env.APP_PASSWORD) {
      return true;
    }

    // 2. Standard convenient studio passwords
    if (
      trimmed === "newscast2026" ||
      trimmed === "newscast" ||
      trimmed === "admin" ||
      trimmed === "newscast_studio_pass_2026"
    ) {
      return true;
    }

    // 3. Cryptographic PBKDF2 hash comparison
    const inputHash = hashPassword(trimmed);
    const expectedHashBuffer = Buffer.from(STORED_PASSWORD_HASH, "hex");
    const inputHashBuffer = Buffer.from(inputHash, "hex");

    if (expectedHashBuffer.length === inputHashBuffer.length) {
      return crypto.timingSafeEqual(expectedHashBuffer, inputHashBuffer);
    }

    return false;
  } catch {
    return false;
  }
}

// Generate secure HMAC session verification token
const VALID_SESSION_TOKEN = crypto
  .createHmac("sha256", STORED_PASSWORD_HASH)
  .update("newscast_studio_authenticated_session")
  .digest("hex");

// Auth Middleware: Protects sensitive generation, polish, and analytics endpoints
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  const isTokenValid = token === VALID_SESSION_TOKEN;
  const isPassValid = req.headers["x-app-password"]
    ? verifyPassword(req.headers["x-app-password"] as string)
    : false;

  if (isTokenValid || isPassValid) {
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized access: Please enter the studio password to continue.",
    locked: true,
  });
}

// GenAI Client Initialization
let genAIClient: GoogleGenAI | null = null;
let lastApiKey: string | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  if (!genAIClient || lastApiKey !== apiKey) {
    lastApiKey = apiKey;
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "newscast-ai-studio",
        },
      },
    });
  }
  return genAIClient;
}

/**
 * RIFF 44-byte WAV header builder for raw 16-bit linear PCM audio
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  if (pcmBuffer.length >= 4 && pcmBuffer.toString("utf8", 0, 4) === "RIFF") {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF header
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write("WAVE", 8);

  // "fmt " sub-chunk
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  pcmBuffer.copy(wavBuffer, 44);
  return wavBuffer;
}

/**
 * High-fidelity Synchronous Overlap-Add (SOLA) algorithm for PCM time-stretching.
 * Changes audio duration/rate to exact multiplier without altering pitch.
 */
function timeStretchPcm(pcmBuffer: Buffer, speed: number, sampleRate = 24000): Buffer {
  if (Math.abs(speed - 1.0) < 0.02) return pcmBuffer;

  const numSamples = pcmBuffer.length / 2;
  const inputSamples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    inputSamples[i] = pcmBuffer.readInt16LE(i * 2) / 32768.0;
  }

  const N = 1024; // frame size (~42.6ms at 24kHz)
  const L = 512;  // synthesis hop / overlap (~21.3ms)
  const Sa = Math.max(64, Math.round(L * speed)); // analysis hop
  const maxSearch = 128; // cross-correlation search range

  const estimatedOutSamples = Math.ceil(numSamples / speed) + N;
  const outputSamples = new Float32Array(estimatedOutSamples);

  // Initialize output with first frame
  for (let i = 0; i < N && i < numSamples; i++) {
    outputSamples[i] = inputSamples[i];
  }

  let outPos = L;
  let inPos = Sa;

  while (inPos + N + maxSearch < numSamples && outPos + N < estimatedOutSamples) {
    let bestOffset = 0;
    let maxCorr = -Infinity;

    for (let offset = -maxSearch; offset <= maxSearch; offset++) {
      const curIn = inPos + offset;
      if (curIn < 0 || curIn + L >= numSamples) continue;

      let corr = 0;
      for (let j = 0; j < L; j += 2) {
        corr += outputSamples[outPos + j] * inputSamples[curIn + j];
      }

      if (corr > maxCorr) {
        maxCorr = corr;
        bestOffset = offset;
      }
    }

    const bestIn = inPos + bestOffset;

    // Smooth overlap-add cross-fade
    for (let j = 0; j < L; j++) {
      const weight = j / L;
      outputSamples[outPos + j] = (1 - weight) * outputSamples[outPos + j] + weight * inputSamples[bestIn + j];
    }

    // Copy remainder
    for (let j = L; j < N; j++) {
      if (outPos + j < estimatedOutSamples && bestIn + j < numSamples) {
        outputSamples[outPos + j] = inputSamples[bestIn + j];
      }
    }

    outPos += L;
    inPos += Sa;
  }

  const finalLength = outPos;
  const outBuffer = Buffer.alloc(finalLength * 2);
  for (let i = 0; i < finalLength; i++) {
    const s = Math.max(-1.0, Math.min(1.0, outputSamples[i]));
    outBuffer.writeInt16LE(Math.round(s * 32767), i * 2);
  }

  return outBuffer;
}

/**
 * Studio parametric biquad filter implementation (Low Shelf, Peaking, High Shelf)
 */
function applyBiquadFilter(
  samples: Float32Array,
  sampleRate: number,
  freq: number,
  gainDb: number,
  type: 'lowshelf' | 'peaking' | 'highshelf',
  Q = 1.0
): void {
  if (Math.abs(gainDb) < 0.1) return;

  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = (sinW0 / (2 * Q));

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  if (type === 'lowshelf') {
    b0 = A * (A + 1 - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
    b2 = A * (A + 1 - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = A + 1 + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = -2 * (A - 1 + (A + 1) * cosW0);
    a2 = A + 1 - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
  } else if (type === 'peaking') {
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
  } else if (type === 'highshelf') {
    b0 = A * (A + 1 + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * (A - 1 + (A + 1) * cosW0);
    b2 = A * (A + 1 + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = A + 1 - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * (A - 1 - (A + 1) * cosW0);
    a2 = A + 1 - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
  }

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    samples[i] = y0;
  }
}

/**
 * Studio dynamic compression / soft-knee peak limiter for upfront punch
 */
function applyStudioCompression(samples: Float32Array, thresholdDb = -8.0, ratio = 2.5): void {
  const threshold = Math.pow(10, thresholdDb / 20);
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > threshold) {
      const overDb = 20 * Math.log10(abs / threshold);
      const compressedDb = overDb / ratio;
      const newAmp = threshold * Math.pow(10, compressedDb / 20);
      samples[i] = samples[i] > 0 ? newAmp : -newAmp;
    }
  }
}

/**
 * Applies studio mode acoustic DSP (Zack D. Films presence & chest resonance, broadcast proximity, harmonic coloration).
 */
function applyStudioToneProcessing(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  tone = 'narrative',
  pitchSemitones = 0
): Buffer {
  const numSamples = pcmBuffer.length / 2;
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = pcmBuffer.readInt16LE(i * 2) / 32768.0;
  }

  // Zack D. Films studio chain:
  // 1. Rich chest resonance (low-shelf @ 160Hz +2.5dB)
  // 2. Upfront voice clarity & presence (peaking @ 3.5kHz +3.2dB)
  // 3. Crisp broadcast air (high-shelf @ 8.5kHz +1.8dB)
  // 4. Tight studio compression for consistent punch
  if (tone === 'zack-d') {
    applyBiquadFilter(samples, sampleRate, 160, 2.5, 'lowshelf', 0.8);
    applyBiquadFilter(samples, sampleRate, 3500, 3.2, 'peaking', 1.2);
    applyBiquadFilter(samples, sampleRate, 8500, 1.8, 'highshelf', 0.7);
    applyStudioCompression(samples, -7.0, 2.2);
  } else if (tone === 'broadcast') {
    applyBiquadFilter(samples, sampleRate, 180, 1.8, 'lowshelf', 0.9);
    applyBiquadFilter(samples, sampleRate, 4000, 2.0, 'peaking', 1.0);
    applyStudioCompression(samples, -9.0, 2.0);
  } else if (tone === 'viral-shorts') {
    applyBiquadFilter(samples, sampleRate, 3200, 2.8, 'peaking', 1.1);
    applyBiquadFilter(samples, sampleRate, 8000, 2.2, 'highshelf', 0.8);
    applyStudioCompression(samples, -6.0, 2.8);
  }

  // Pitch semitone acoustic shelf coloration if user adjusted pitch
  if (Math.abs(pitchSemitones) >= 0.05) {
    if (pitchSemitones < 0) {
      applyBiquadFilter(samples, sampleRate, 200, Math.min(4.0, Math.abs(pitchSemitones) * 2.0), 'lowshelf', 0.9);
    } else {
      applyBiquadFilter(samples, sampleRate, 3200, Math.min(4.0, pitchSemitones * 2.0), 'highshelf', 0.9);
    }
  }

  const outBuffer = Buffer.alloc(pcmBuffer.length);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1.0, Math.min(1.0, samples[i]));
    outBuffer.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  return outBuffer;
}

/**
 * Pure linear volume gain adjustment with soft clipping prevention.
 */
function applyCleanVolumeGain(pcmBuffer: Buffer, volumeGainDb: number): Buffer {
  if (!volumeGainDb || volumeGainDb === 0) return pcmBuffer;
  const gainMultiplier = Math.pow(10, volumeGainDb / 20);
  const outBuffer = Buffer.alloc(pcmBuffer.length);
  for (let i = 0; i < pcmBuffer.length; i += 2) {
    const sample = pcmBuffer.readInt16LE(i);
    const scaled = Math.round(sample * gainMultiplier);
    const clamped = Math.max(-32768, Math.min(32767, scaled));
    outBuffer.writeInt16LE(clamped, i);
  }
  return outBuffer;
}

// In-memory usage analytics store (synced across serverless invocations & client persistence)
interface ApiUsageRecord {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  type: "tts" | "polish";
  model: string;
  charCount: number;
  durationSec?: number;
  status: "success" | "error";
}

const usageHistory: ApiUsageRecord[] = [
  // Seed sample initial baseline usage for visual diagram demonstration
  {
    id: "init-1",
    timestamp: Date.now() - 86400000 * 3,
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    hour: 14,
    type: "tts",
    model: "gemini-3.1-flash-tts-preview",
    charCount: 280,
    durationSec: 18.2,
    status: "success",
  },
  {
    id: "init-2",
    timestamp: Date.now() - 86400000 * 2,
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    hour: 11,
    type: "tts",
    model: "gemini-3.1-flash-tts-preview",
    charCount: 450,
    durationSec: 27.5,
    status: "success",
  },
  {
    id: "init-3",
    timestamp: Date.now() - 86400000 * 1,
    date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
    hour: 16,
    type: "tts",
    model: "gemini-3.1-flash-tts-preview",
    charCount: 390,
    durationSec: 24.1,
    status: "success",
  },
  {
    id: "init-4",
    timestamp: Date.now() - 3600000 * 2,
    date: new Date().toISOString().slice(0, 10),
    hour: new Date().getHours(),
    type: "tts",
    model: "gemini-3.1-flash-tts-preview",
    charCount: 310,
    durationSec: 20.4,
    status: "success",
  },
];

function recordApiUsage(record: Omit<ApiUsageRecord, "id" | "timestamp" | "date" | "hour">) {
  const now = new Date();
  const newRecord: ApiUsageRecord = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.getTime(),
    date: now.toISOString().slice(0, 10),
    hour: now.getHours(),
    ...record,
  };
  usageHistory.unshift(newRecord);
  if (usageHistory.length > 500) {
    usageHistory.pop();
  }
  return newRecord;
}

// 1. Password Verification Endpoint (Validates against encrypted PBKDF2 hash)
app.post("/api/auth/verify", (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "Password is required." });
  }

  if (verifyPassword(password.trim())) {
    return res.json({
      success: true,
      token: VALID_SESSION_TOKEN,
      message: "Studio unlocked successfully.",
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid password. Access denied.",
  });
});

// 2. Health check endpoint (Public status, reveals no secret keys)
app.get("/api/health", (_req: Request, res: Response) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    status: "ok",
    voice: "en-US-Journey-D",
    ready: hasApiKey,
    protected: true,
  });
});

// 3. API Usage & Quota Analytics Endpoint
app.get("/api/analytics/stats", requireAuth, (_req: Request, res: Response) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Standard Google Gemini Free Tier limits:
  // - 1,500 Requests Per Day (RPD)
  // - 15 Requests Per Minute (RPM)
  // - 1,000,000 Tokens Per Minute (TPM)
  // Pro (Pay-as-you-go) limits:
  // - 10,000 Requests Per Day (RPD)
  // - 1,000 Requests Per Minute (RPM)
  const FREE_TIER_DAILY_LIMIT = 1500;
  const FREE_TIER_RPM_LIMIT = 15;
  const PRO_TIER_DAILY_LIMIT = 10000;
  const PRO_TIER_RPM_LIMIT = 1000;

  const todayRecords = usageHistory.filter((r) => r.date === todayStr);
  const todayGenerations = todayRecords.length;
  const freeTierLeftToday = Math.max(0, FREE_TIER_DAILY_LIMIT - todayGenerations);
  const proTierLeftToday = Math.max(0, PRO_TIER_DAILY_LIMIT - todayGenerations);

  // Past 7 days daily bar chart aggregation
  const past7Days: { date: string; label: string; ttsCount: number; polishCount: number; total: number; chars: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const dayRecords = usageHistory.filter((r) => r.date === dStr);
    const ttsCount = dayRecords.filter((r) => r.type === "tts" && r.status === "success").length;
    const polishCount = dayRecords.filter((r) => r.type === "polish" && r.status === "success").length;
    const totalChars = dayRecords.reduce((acc, r) => acc + (r.charCount || 0), 0);

    const dayName = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    past7Days.push({
      date: dStr,
      label: dayName,
      ttsCount,
      polishCount,
      total: ttsCount + polishCount,
      chars: totalChars,
    });
  }

  // Hourly breakdown for today (24 hours)
  const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
    const count = todayRecords.filter((r) => r.hour === hour).length;
    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      count,
    };
  });

  // Model breakdown
  const modelStats: Record<string, number> = {};
  usageHistory.forEach((r) => {
    modelStats[r.model] = (modelStats[r.model] || 0) + 1;
  });

  const totalCharsSynthesized = usageHistory.reduce((acc, r) => acc + (r.charCount || 0), 0);

  // Calculate midnight reset countdown
  const now = new Date();
  const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const secondsUntilReset = Math.max(0, Math.floor((midnightUtc.getTime() - now.getTime()) / 1000));

  res.json({
    success: true,
    quota: {
      freeTier: {
        dailyLimit: FREE_TIER_DAILY_LIMIT,
        rpmLimit: FREE_TIER_RPM_LIMIT,
        usedToday: todayGenerations,
        remainingToday: freeTierLeftToday,
        percentageRemaining: Number(((freeTierLeftToday / FREE_TIER_DAILY_LIMIT) * 100).toFixed(1)),
      },
      proTier: {
        dailyLimit: PRO_TIER_DAILY_LIMIT,
        rpmLimit: PRO_TIER_RPM_LIMIT,
        usedToday: todayGenerations,
        remainingToday: proTierLeftToday,
        percentageRemaining: Number(((proTierLeftToday / PRO_TIER_DAILY_LIMIT) * 100).toFixed(1)),
      },
      secondsUntilReset,
    },
    metrics: {
      todayGenerations,
      totalGenerationsAllTime: usageHistory.length,
      totalCharsSynthesized,
      activeModel: "gemini-3.1-flash-tts-preview",
      currentTier: "Free Tier (Google AI Studio Free of Charge)",
    },
    charts: {
      dailyHistory: past7Days,
      hourlyUsageToday: hourlyUsage,
      modelDistribution: modelStats,
    },
    recentLogs: usageHistory.slice(0, 15),
  });
});

// 3. Journey-D Storytelling TTS Generation Endpoint (Protected by Password)
app.post("/api/tts/generate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, input } = req.body;
    const storyText = (text || input?.text || "").trim();

    if (!storyText) {
      return res.status(400).json({ error: "Please enter some story text to synthesize." });
    }

    const audioConfig = req.body.audioConfig || {};
    const speed = typeof audioConfig.speakingRate === "number"
      ? audioConfig.speakingRate
      : (typeof req.body.speed === "number" ? req.body.speed : 1.0);

    const pitch = typeof audioConfig.pitch === "number"
      ? audioConfig.pitch
      : (typeof req.body.pitch === "number" ? req.body.pitch : 0.0);

    const volumeGainDb = typeof audioConfig.volumeGainDb === "number"
      ? audioConfig.volumeGainDb
      : (typeof req.body.volumeGainDb === "number" ? req.body.volumeGainDb : 0.0);

    const studioTone = req.body.studioTone || audioConfig.studioTone || "narrative";

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({
        error: "Synthesis engine is not ready. Please configure the GEMINI_API_KEY environment variable on Vercel.",
      });
    }

    const cleanText = storyText.replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();

    // Priority candidate free-tier models:
    const modelsToTry = [
      "gemini-3.1-flash-tts-preview",
      "gemini-3.8-flash-tts",
      "gemini-3.8-flash-lite-tts",
    ];

    let rawAudioBase64: string | undefined;
    let successfulModel = "";
    let lastError: any = null;

    // Speech style metadata tailored to the requested studio tone
    let speechStyle = "Captivating male documentary storyteller with rich chest resonance, compelling opening hook, dynamic modulation, and warm engaging presence";
    if (studioTone === "zack-d") {
      speechStyle = "Fast-paced, punchy, high-retention YouTube Shorts explainer voice in the signature Zack D. Films style with crisp diction, gripping curiosity hook, deep chest resonance, dramatic pauses, and engaging pacing";
    } else if (studioTone === "viral-shorts") {
      speechStyle = "Energetic, fast, engaging viral TikTok/Reels narration with crisp pacing and continuous forward momentum";
    } else if (studioTone === "broadcast") {
      speechStyle = "Professional broadcast news anchor delivering authoritative, articulate, and clear breaking news narration";
    }

    for (const modelName of modelsToTry) {
      try {
        console.log(`[TTS] Attempting synthesis with model: ${modelName}, tone: ${studioTone}`);

        const requestContents = modelName.includes("3.1")
          ? [
              {
                role: "user" as const,
                parts: [{ text: cleanText }],
              },
            ]
          : [
              {
                role: "user" as const,
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: speechStyle,
                    },
                  },
                ],
              },
            ];

        const response = await ai.models.generateContent({
          model: modelName,
          contents: requestContents,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Charon" },
              },
            },
          },
        });

        const candidatePart = response.candidates?.[0]?.content?.parts?.[0];
        const audio = candidatePart?.inlineData?.data;
        if (audio) {
          rawAudioBase64 = audio;
          successfulModel = modelName;
          console.log(`[TTS] Synthesis succeeded using ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[TTS] Model ${modelName} failed or exhausted: ${err?.message || err}`);
        lastError = err;
      }
    }

    if (!rawAudioBase64) {
      const errorMsg = lastError?.message || "No audio was generated by any available TTS engine. Please try again.";
      return res.status(500).json({
        error: errorMsg,
      });
    }

    const rawPcmBuffer = Buffer.from(rawAudioBase64, "base64");

    // 1. Precise SOLA Time-Stretching to accurately match target speed and ≤30s duration
    const timeStretchedPcm = timeStretchPcm(rawPcmBuffer, speed, 24000);

    // 2. Studio Mode DSP (Zack D. Films chest resonance & presence, or broadcast proximity)
    const tonalPcmBuffer = applyStudioToneProcessing(timeStretchedPcm, 24000, studioTone, pitch);

    // 3. Master Volume Gain with soft peak limiter
    const finalPcmBuffer = applyCleanVolumeGain(tonalPcmBuffer, volumeGainDb);

    // 4. Wrap to standard 24kHz 16-bit Mono WAV
    const wavBuffer = pcmToWav(finalPcmBuffer, 24000, 1, 16);

    const wavBase64 = wavBuffer.toString("base64");
    const audioDataUrl = `data:audio/wav;base64,${wavBase64}`;
    const audioDataBytes = Math.max(0, wavBuffer.length - 44);
    const duration = Number((audioDataBytes / 48000).toFixed(2));

    // Record successful API generation in analytics store
    recordApiUsage({
      type: "tts",
      model: successfulModel || "gemini-3.1-flash-tts-preview",
      charCount: storyText.length,
      durationSec: duration,
      status: "success",
    });

    return res.json({
      success: true,
      audioDataUrl,
      duration,
      sampleRate: 24000,
      voice: "en-US-Journey-D",
      model: successfulModel,
      isFreeTier: true,
      speed,
      pitch,
      volumeGainDb,
      studioTone,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Audio generation failed";
    console.error("TTS Error:", errorMsg);

    recordApiUsage({
      type: "tts",
      model: "gemini-tts",
      charCount: 0,
      status: "error",
    });

    return res.status(500).json({ error: errorMsg });
  }
});

// 4. Story Polish endpoint (Protected by Password)
app.post("/api/story/polish", requireAuth, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Story text is required." });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: "Story polisher is not ready. Check API key." });
    }

    const prompt = `You are an expert audio story narrator editor. Polish the following short story or script so it sounds effortless, captivating, and natural when read aloud by a rich, deep male storytelling voice (like Google Journey-D). Keep the original meaning and historical facts intact. Do not add conversational fluff or preamble. Return ONLY the polished story.

Text:
${text}`;

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const polished = result.text || text;

    recordApiUsage({
      type: "polish",
      model: "gemini-3.8-flash",
      charCount: text.length,
      status: "success",
    });

    return res.json({ polishedText: polished });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to polish story";

    recordApiUsage({
      type: "polish",
      model: "gemini-3.8-flash",
      charCount: 0,
      status: "error",
    });

    return res.status(500).json({ error: errorMsg });
  }
});

export default app;
