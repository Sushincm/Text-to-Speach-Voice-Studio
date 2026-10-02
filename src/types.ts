export type StudioTone = 'zack-d' | 'narrative' | 'viral-shorts' | 'broadcast' | 'custom';

export interface StoryPreset {
  id: string;
  title: string;
  badge: string;
  story: string;
  suggestedSpeed?: number;
  suggestedPitch?: number;
  suggestedVolumeGainDb?: number;
  suggestedTone?: StudioTone;
}

export interface AudioTake {
  id: string;
  timestamp: number;
  title: string;
  text: string;
  audioUrl: string;
  duration: number; // in seconds
  speed: number;
  pitch: number;
  volumeGainDb: number;
  studioTone?: StudioTone;
}
