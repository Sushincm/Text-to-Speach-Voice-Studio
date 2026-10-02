export interface StoryPreset {
  id: string;
  title: string;
  badge: string;
  story: string;
  suggestedSpeed?: number;
  suggestedPitch?: number;
  suggestedVolumeGainDb?: number;
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
}
