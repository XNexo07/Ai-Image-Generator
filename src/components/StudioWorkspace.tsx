import { useState } from 'react';
import {
  Download,
  Heart,
  Loader2,
  Shuffle,
  SlidersHorizontal,
  Sun,
  Moon,
  Wand2,
  X,
  Maximize2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import type {
  AspectPresetId,
  ConnectionSettings,
  EngineId,
  GeneratedArtwork,
  JobProgress,
  ModelsCatalog,
} from '../types';
import {
  ASPECT_PRESETS,
  EXAMPLE_PROMPTS,
  STYLE_PRESETS,
  optimizePromptForDiffusion,
} from '../utils/promptHelper';
import { downloadDataUrl } from './GalleryView';

interface StudioWorkspaceProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (val: string) => void;
  engine: EngineId;
  onEngineChange: (engine: EngineId) => void;
  model: string;
  onModelChange: (model: string) => void;
  aspectId: AspectPresetId;
  onAspectChange: (id: AspectPresetId) => void;
  steps: number;
  onStepsChange: (val: number) => void;
  cfgScale: number;
  onCfgScaleChange: (val: number) => void;
  sampler: string;
  onSamplerChange: (val: string) => void;
  seed: string;
  onSeedChange: (val: string) => void;
  catalog: ModelsCatalog | null;
  settings: ConnectionSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  jobProgress: JobProgress | null;
  errorMsg: string | null;
  onDismissError: () => void;
  activeArtwork: GeneratedArtwork | null;
  recentArtworks: GeneratedArtwork[];
  onSelectArtwork: (item: GeneratedArtwork) => void;
  onToggleFavorite: (id: string) => void;
  onGenerate: (overrideSeed?: string) => void;
  onCancelJob: () => void;
  onOpenSettings: () => void;
}

const ENGINE_OPTIONS: Array<{ id: EngineId; label: string; hint: string }> = [
  { id: 'aihorde', label: 'AI Horde (Kostenlos · Community)', hint: 'Ohne Key bis 576×576 px · Open Source' },
  { id: 'pollinations', label: 'Pollinations (Flux)', hint: 'Schnell · 1 Bild / 45 s ohne Key' },
  { id: 'huggingface', label: 'Hugging Face Inference', hint: 'FLUX.1 & SDXL mit eigenem HF-Token' },
  { id: 'custom', label: 'Lokaler SD-Server', hint: 'Automatic1111 / Forge / OpenAI-API' },
  { id: 'procedural', label: 'Lokal Prozedural (Offline)', hint: '0 ms · komplett ohne Internet' },
];

export function StudioWorkspace({
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  engine,
  onEngineChange,
  model,
  onModelChange,
  aspectId,
  onAspectChange,
  steps,
  onStepsChange,
  cfgScale,
  onCfgScaleChange,
  sampler,
  onSamplerChange,
  seed,
  onSeedChange,
  catalog,
  settings,
  theme,
  onToggleTheme,
  jobProgress,
  errorMsg,
  onDismissError,
  activeArtwork,
  recentArtworks,
  onSelectArtwork,
  onToggleFavorite,
  onGenerate,
  onCancelJob,
  onOpenSettings,
}: StudioWorkspaceProps) {
  const [showNegative, setShowNegative] = useState(Boolean(negativePrompt));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const isBusy = Boolean(jobProgress);
  const aspectPreset = ASPECT_PRESETS.find((a) => a.id === aspectId) ?? ASPECT_PRESETS[0];
  const isAnonymousHorde = engine === 'aihorde' && !settings.aiHordeKey.trim();
  const effectiveWidth = isAnonymousHorde ? aspectPreset.anonymousWidth : aspectPreset.width;
  const effectiveHeight = isAnonymousHorde ? aspectPreset.anonymousHeight : aspectPreset.height;

  const handleApplyStyle = (suffix: string, recommendedModel: string) => {
    const clean = prompt.trim();
    if (!clean) {
      onPromptChange(suffix);
    } else if (!clean.toLowerCase().includes(suffix.slice(0, 14).toLowerCase())) {
      onPromptChange(`${clean}, ${suffix}`);
    }
    if (engine === 'aihorde' && catalog?.aihorde.some((m) => m.name === recommendedModel)) {
      onModelChange(recommendedModel);
    }
  };

  const handleOptimizePrompt = () => {
    if (!prompt.trim()) return;
    onPromptChange(optimizePromptForDiffusion(prompt));
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const currentEngineMeta = ENGINE_OPTIONS.find((e) => e.id === engine) ?? ENGINE_OPTIONS[0];

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Left Parameter Sidebar */}
      <aside className="w-full lg:w-[310px] shrink-0 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111317] flex flex-col justify-between overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Engine Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="engine-select" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                KI-Engine
              </label>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-[#E04F26] dark:hover:text-[#F05A30] transition-colors cursor-pointer"
              >
                Endpunkte
              </button>
            </div>
            <select
              id="engine-select"
              value={engine}
              onChange={(e) => onEngineChange(e.target.value as EngineId)}
              className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
            >
              {ENGINE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              {currentEngineMeta.hint}
            </p>
          </div>

          {/* Model Selection */}
          {engine !== 'procedural' && (
            <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800">
              <label htmlFor="model-select" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Diffusionsmodell
              </label>
              {engine === 'aihorde' && (
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
                >
                  {(catalog?.aihorde.length ? catalog.aihorde : [
                    { name: 'Deliberate', workers: 8, eta: 0 },
                    { name: 'Dreamshaper', workers: 6, eta: 0 },
                    { name: 'AbsoluteReality', workers: 6, eta: 10 },
                    { name: 'AlbedoBase XL (SDXL)', workers: 6, eta: 12 },
                    { name: 'stable_diffusion', workers: 10, eta: 0 },
                  ]).map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.workers} GPUs)
                    </option>
                  ))}
                </select>
              )}

              {engine === 'pollinations' && (
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
                >
                  {(catalog?.pollinations ?? [
                    { name: 'flux', label: 'Flux (Standard)' },
                    { name: 'turbo', label: 'SDXL Turbo (Schnell)' },
                    { name: 'flux-realism', label: 'Flux Realism' },
                  ]).map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}

              {engine === 'huggingface' && (
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
                >
                  {(catalog?.huggingface ?? [
                    { name: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell' },
                    { name: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL 1.0' },
                  ]).map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}

              {engine === 'custom' && (
                <input
                  id="model-select"
                  type="text"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  placeholder={settings.customModelName || 'Standardmodell des Servers'}
                  className="w-full px-3 py-2 text-sm font-mono rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
                />
              )}
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Format
              </span>
              <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {effectiveWidth} × {effectiveHeight} px
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ASPECT_PRESETS.map((preset) => {
                const active = aspectId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onAspectChange(preset.id)}
                    className={`px-2.5 py-2 text-xs font-medium rounded-md border text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                      active
                        ? 'border-[#E04F26] dark:border-[#F05A30] bg-[#E04F26]/10 dark:bg-[#F05A30]/15 text-neutral-950 dark:text-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#16191F] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diffusion Parameters */}
          {engine !== 'procedural' && engine !== 'pollinations' && (
            <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Feineinstellung</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="steps-range" className="text-neutral-600 dark:text-neutral-400">
                    Schritte (Steps)
                  </label>
                  <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {isAnonymousHorde ? Math.min(25, steps) : steps}
                  </span>
                </div>
                <input
                  id="steps-range"
                  type="range"
                  min={10}
                  max={isAnonymousHorde ? 25 : 45}
                  step={1}
                  value={isAnonymousHorde ? Math.min(25, steps) : steps}
                  onChange={(e) => onStepsChange(Number(e.target.value))}
                  className="w-full accent-[#E04F26] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="cfg-range" className="text-neutral-600 dark:text-neutral-400">
                    Prompt-Treue (CFG)
                  </label>
                  <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {cfgScale.toFixed(1)}
                  </span>
                </div>
                <input
                  id="cfg-range"
                  type="range"
                  min={2}
                  max={14}
                  step={0.5}
                  value={cfgScale}
                  onChange={(e) => onCfgScaleChange(Number(e.target.value))}
                  className="w-full accent-[#E04F26] cursor-pointer"
                />
              </div>

              {(engine === 'aihorde' || engine === 'custom') && (
                <div>
                  <label htmlFor="sampler-select" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sampler
                  </label>
                  <select
                    id="sampler-select"
                    value={sampler}
                    onChange={(e) => onSamplerChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
                  >
                    <option value="k_euler_a">k_euler_a (Ausgewogen)</option>
                    <option value="k_dpmpp_2m">k_dpmpp_2m (Scharf)</option>
                    <option value="k_dpm_2_a">k_dpm_2_a (Detailreich)</option>
                    <option value="DDIM">DDIM (Klassisch)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Seed */}
          <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800">
            <label htmlFor="seed-input" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Seed (optional)
            </label>
            <div className="flex gap-1.5">
              <input
                id="seed-input"
                type="text"
                value={seed}
                onChange={(e) => onSeedChange(e.target.value.replace(/[^\d-]/g, ''))}
                placeholder="Zufällig"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
              />
              <button
                type="button"
                onClick={() => onSeedChange('')}
                title="Zufälligen Seed verwenden"
                aria-label="Seed zurücksetzen auf Zufall"
                className="px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Theme Switch */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Darstellung
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Heller Modus</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dunkelkammer</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#F7F8FA] dark:bg-[#0D0F12]">
        {/* Prompt Composer */}
        <section className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111317] p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="prompt-input" className="sr-only">
                  Bildbeschreibung (Prompt)
                </label>
                <textarea
                  id="prompt-input"
                  rows={2}
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isBusy) {
                      e.preventDefault();
                      onGenerate();
                    }
                  }}
                  placeholder="Beschreibe das Bild möglichst konkret (Motiv, Licht, Kamera, Material)…"
                  className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-950 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26] dark:focus:border-[#F05A30] resize-none"
                />
              </div>

              <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                {isBusy ? (
                  <button
                    type="button"
                    onClick={onCancelJob}
                    className="px-5 py-2.5 text-sm font-medium rounded-md border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGenerate()}
                    disabled={!prompt.trim()}
                    className="px-6 py-2.5 text-sm font-medium rounded-md bg-[#E04F26] hover:bg-[#C83F1A] dark:bg-[#F05A30] dark:hover:bg-[#D94A22] disabled:opacity-45 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Bild generieren
                  </button>
                )}
              </div>
            </div>

            {showNegative && (
              <div>
                <label htmlFor="neg-prompt" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Negativ-Prompt (was vermieden werden soll)
                </label>
                <input
                  id="neg-prompt"
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => onNegativePromptChange(e.target.value)}
                  placeholder="z. B. blurry, distorted, watermark, text, low quality"
                  className="w-full px-3 py-1.5 text-xs rounded-md bg-neutral-50 dark:bg-[#16191F] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
                />
              </div>
            )}

            {/* Style Presets & Prompt Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleApplyStyle(style.promptSuffix, style.recommendedModel)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    + {style.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-[#E04F26] dark:hover:text-[#F05A30] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Prompt optimieren</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNegative((v) => !v)}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {showNegative ? 'Negativ-Prompt ausblenden' : '+ Negativ-Prompt'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Central Focal Canvas */}
        <section className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center overflow-y-auto">
          <div className="w-full max-w-4xl">
            {errorMsg && (
              <div className="mb-5 p-4 rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                      {errorMsg}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {engine !== 'aihorde' && (
                        <button
                          type="button"
                          onClick={() => {
                            onDismissError();
                            onEngineChange('aihorde');
                          }}
                          className="font-medium underline text-red-800 dark:text-red-300 cursor-pointer"
                        >
                          Zu AI Horde wechseln
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDismissError();
                          onEngineChange('procedural');
                        }}
                        className="font-medium underline text-red-800 dark:text-red-300 cursor-pointer"
                      >
                        Lokal prozedural testen
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismissError}
                  aria-label="Fehlermeldung schließen"
                  className="text-red-600 dark:text-red-400 hover:text-red-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {jobProgress ? (
              <div className="p-8 sm:p-12 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C] text-center max-w-xl mx-auto">
                <Loader2 className="w-7 h-7 text-[#E04F26] dark:text-[#F05A30] animate-spin mx-auto" />
                <h2 className="mt-4 font-display text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                  {jobProgress.statusMessage}
                </h2>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span>Verstrichen: {jobProgress.elapsedSec.toFixed(1)} s</span>
                  {typeof jobProgress.queuePosition === 'number' && jobProgress.queuePosition > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Warteschlange: Platz {jobProgress.queuePosition}</span>
                    </>
                  )}
                  {typeof jobProgress.waitTime === 'number' && jobProgress.waitTime > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Restzeit ca. {jobProgress.waitTime} s</span>
                    </>
                  )}
                </div>
                <div className="mt-5 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-[#E04F26] dark:bg-[#F05A30] transition-all duration-500"
                    style={{
                      width:
                        jobProgress.phase === 'downloading'
                          ? '92%'
                          : jobProgress.phase === 'processing'
                            ? '68%'
                            : jobProgress.phase === 'queued'
                              ? '35%'
                              : '15%',
                    }}
                  />
                </div>
              </div>
            ) : activeArtwork ? (
              <div className="space-y-4">
                <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C] p-3 flex items-center justify-center">
                  <img
                    src={activeArtwork.dataUrl}
                    alt={activeArtwork.prompt}
                    referrerPolicy="no-referrer"
                    onClick={() => setLightboxOpen(true)}
                    className="max-h-[60vh] w-auto object-contain rounded cursor-zoom-in"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Bild vergrößern"
                    className="absolute top-5 right-5 p-2 rounded-md bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Unboxed typographic metadata + direct actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2">
                      {activeArtwork.prompt}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                      <span>{activeArtwork.engineLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeArtwork.model}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeArtwork.width} × {activeArtwork.height} px</span>
                      <span aria-hidden="true">·</span>
                      <span>Seed {activeArtwork.seed}</span>
                      <span aria-hidden="true">·</span>
                      <span>{(activeArtwork.durationMs / 1000).toFixed(1)} s</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(activeArtwork.dataUrl, `bildwerk-${activeArtwork.seed}.png`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Herunterladen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSeedChange('');
                        onGenerate('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Variante</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSeedChange(activeArtwork.seed)}
                      className="px-3 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Seed fixieren
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(activeArtwork.prompt)}
                      aria-label="Prompt kopieren"
                      className="p-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(activeArtwork.id)}
                      aria-label={activeArtwork.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                      className={`p-2 rounded-md border border-neutral-300 dark:border-neutral-700 transition-colors cursor-pointer ${
                        activeArtwork.favorite
                          ? 'text-[#E04F26] dark:text-[#F05A30] border-[#E04F26] dark:border-[#F05A30]'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${activeArtwork.favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State with 1-click Starter Prompts */
              <div className="p-8 sm:p-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C]">
                <div className="max-w-xl">
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 text-balance">
                    KI-Bilder erzeugen – direkt über offene Modelle ohne Google-API
                  </h1>
                  <p className="mt-2.5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Nutze kostenlose Open-Source-GPUs über <span className="font-medium text-neutral-900 dark:text-neutral-200">AI Horde</span>, verbinde deinen eigenen <span className="font-medium text-neutral-900 dark:text-neutral-200">Hugging-Face-</span> oder <span className="font-medium text-neutral-900 dark:text-neutral-200">lokalen Stable-Diffusion-Server</span> oder synthetisiere Motive komplett offline.
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex.title}
                      type="button"
                      onClick={() => {
                        onPromptChange(ex.prompt);
                      }}
                      className="p-3.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111317] hover:border-[#E04F26] dark:hover:border-[#F05A30] text-left transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {ex.title}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {ex.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Filmstrip */}
            {recentArtworks.length > 0 && (
              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Letzte Generierungen
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                    {recentArtworks.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {recentArtworks.slice(0, 12).map((item) => {
                    const isSelected = activeArtwork?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectArtwork(item)}
                        className={`w-16 h-16 shrink-0 rounded-md overflow-hidden border-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#E04F26] dark:border-[#F05A30]'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={item.dataUrl}
                          alt={item.prompt}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox Overlay */}
      {lightboxOpen && activeArtwork && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Vollbild schließen"
            className="absolute top-4 right-4 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={activeArtwork.dataUrl}
            alt={activeArtwork.prompt}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
}
