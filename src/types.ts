export type EngineId = 'aihorde' | 'pollinations' | 'huggingface' | 'custom' | 'procedural';

export type AppView = 'studio' | 'gallery' | 'models' | 'settings';

export type AspectPresetId = '1:1' | '4:3' | '3:4' | '16:9';

export interface AspectPreset {
  id: AspectPresetId;
  label: string;
  width: number;
  height: number;
  anonymousWidth: number;
  anonymousHeight: number;
}

export interface HordeModelInfo {
  name: string;
  workers: number;
  queued: number;
  eta: number;
  category: string;
  description: string;
}

export interface SimpleModelInfo {
  name: string;
  label: string;
  description: string;
}

export interface ModelsCatalog {
  aihorde: HordeModelInfo[];
  pollinations: SimpleModelInfo[];
  huggingface: SimpleModelInfo[];
}

export interface GeneratedArtwork {
  id: string;
  prompt: string;
  negativePrompt: string;
  engine: EngineId;
  engineLabel: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  seed: string;
  workerName?: string;
  durationMs: number;
  createdAt: number;
  dataUrl: string;
  favorite: boolean;
}

export interface ConnectionSettings {
  aiHordeKey: string;
  pollinationsKey: string;
  huggingFaceToken: string;
  customEndpointUrl: string;
  customEndpointType: 'a1111' | 'openai';
  customApiKey: string;
  customModelName: string;
}

export interface JobProgress {
  engine: EngineId;
  jobId?: string;
  phase: 'submitting' | 'queued' | 'processing' | 'downloading';
  queuePosition?: number;
  waitTime?: number;
  processing?: number;
  elapsedSec: number;
  statusMessage: string;
}
