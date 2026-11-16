import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppView,
  AspectPresetId,
  ConnectionSettings,
  EngineId,
  GeneratedArtwork,
  JobProgress,
  ModelsCatalog,
} from './types';
import { TopBar } from './components/TopBar';
import { StudioWorkspace } from './components/StudioWorkspace';
import { GalleryView } from './components/GalleryView';
import { ModelsView } from './components/ModelsView';
import { SettingsView } from './components/SettingsView';
import { ASPECT_PRESETS } from './utils/promptHelper';
import { generateProceduralArtwork } from './utils/proceduralEngine';
import {
  cancelAiHordeJob,
  checkAiHordeJob,
  fetchModelsCatalog,
  generateCustomServerDirect,
  generateHuggingFaceDirect,
  generatePollinationsDirect,
  submitAiHordeJob,
} from './utils/imageProviders';
import {
  clearAllArtworks,
  deleteArtwork,
  listArtworks,
  loadConnectionSettings,
  loadTheme,
  saveArtwork,
  saveConnectionSettings,
  saveTheme,
  toggleFavoriteArtwork,
} from './utils/galleryStorage';

const ENGINE_LABELS: Record<EngineId, string> = {
  aihorde: 'AI Horde',
  pollinations: 'Pollinations',
  huggingface: 'Hugging Face',
  custom: 'Lokaler SD-Server',
  procedural: 'Lokal Prozedural',
};

const DEFAULT_MODEL_BY_ENGINE: Record<EngineId, string> = {
  aihorde: 'Deliberate',
  pollinations: 'flux',
  huggingface: 'black-forest-labs/FLUX.1-schnell',
  custom: '',
  procedural: 'FBM-Domain-Warp',
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('studio');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => loadTheme());
  const [settings, setSettings] = useState<ConnectionSettings>(() => loadConnectionSettings());

  // Studio parameters
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, watermark');
  const [engine, setEngine] = useState<EngineId>('aihorde');
  const [model, setModel] = useState('Deliberate');
  const [aspectId, setAspectId] = useState<AspectPresetId>('1:1');
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [sampler, setSampler] = useState('k_euler_a');
  const [seed, setSeed] = useState('');

  // Models catalog
  const [catalog, setCatalog] = useState<ModelsCatalog | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Gallery & active generation state
  const [artworks, setArtworks] = useState<GeneratedArtwork[]>([]);
  const [activeArtwork, setActiveArtwork] = useState<GeneratedArtwork | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  // Sync theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Load saved gallery from IndexedDB
  useEffect(() => {
    listArtworks()
      .then((items) => {
        setArtworks(items);
        if (items.length > 0) {
          setActiveArtwork(items[0]);
        }
      })
      .catch(() => {
        // Ignore IndexedDB unavailable error
      });
  }, []);

  const fetchModels = useCallback(async (force = false) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const data = await fetchModelsCatalog(force);
      setCatalog(data);
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Fehler beim Laden der Modelle.');
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels(false);
  }, [fetchModels]);

  const handleEngineChange = (nextEngine: EngineId) => {
    setEngine(nextEngine);
    if (nextEngine === 'custom') {
      setModel(settings.customModelName || '');
    } else {
      setModel(DEFAULT_MODEL_BY_ENGINE[nextEngine]);
    }
  };

  const handleSaveSettings = (next: ConnectionSettings) => {
    setSettings(next);
    saveConnectionSettings(next);
  };

  const persistNewArtwork = async (item: GeneratedArtwork) => {
    setActiveArtwork(item);
    setArtworks((prev) => [item, ...prev]);
    try {
      await saveArtwork(item);
    } catch {
      // Ignore storage failures silently
    }
  };

  const handleCancelJob = async () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    setJobProgress(null);
    if (jobId) {
      cancelAiHordeJob(jobId);
    }
  };

  const handleGenerate = async (overrideSeed?: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    setErrorMsg(null);
    cancelledRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;

    const startTime = Date.now();
    const usedSeedInput = overrideSeed !== undefined ? overrideSeed : seed;
    const preset = ASPECT_PRESETS.find((p) => p.id === aspectId) ?? ASPECT_PRESETS[0];
    const isAnonHorde = engine === 'aihorde' && !settings.aiHordeKey.trim();
    const width = isAnonHorde ? preset.anonymousWidth : preset.width;
    const height = isAnonHorde ? preset.anonymousHeight : preset.height;

    const elapsedInterval = window.setInterval(() => {
      setJobProgress((prev) =>
        prev ? { ...prev, elapsedSec: (Date.now() - startTime) / 1000 } : prev
      );
    }, 200);

    try {
      if (engine === 'procedural') {
        setJobProgress({
          engine,
          phase: 'processing',
          elapsedSec: 0,
          statusMessage: 'Synthetisiere Bild lokal im Browser…',
        });
        await new Promise((r) => setTimeout(r, 40));
        const res = generateProceduralArtwork({
          prompt: cleanPrompt,
          width: preset.width,
          height: preset.height,
          seed: usedSeedInput,
        });
        const item: GeneratedArtwork = {
          id: crypto.randomUUID(),
          prompt: cleanPrompt,
          negativePrompt: '',
          engine,
          engineLabel: ENGINE_LABELS[engine],
          model: 'FBM-Domain-Warp',
          width: preset.width,
          height: preset.height,
          steps: 4,
          cfgScale: 1,
          sampler: 'Lokal Canvas',
          seed: res.seed,
          durationMs: Date.now() - startTime,
          createdAt: Date.now(),
          dataUrl: res.dataUrl,
          favorite: false,
        };
        await persistNewArtwork(item);
        return;
      }

      if (engine === 'aihorde') {
        setJobProgress({
          engine,
          phase: 'submitting',
          elapsedSec: 0,
          statusMessage: 'Auftrag wird an AI Horde übermittelt…',
        });

        const submitData = await submitAiHordeJob({
          prompt: cleanPrompt,
          negativePrompt,
          model,
          width,
          height,
          steps,
          cfgScale,
          sampler,
          seed: usedSeedInput,
          apiKey: settings.aiHordeKey,
          signal: controller.signal,
        });

        const jobId = submitData.id;
        activeJobIdRef.current = jobId;

        setJobProgress({
          engine,
          jobId,
          phase: 'queued',
          elapsedSec: (Date.now() - startTime) / 1000,
          statusMessage: 'Warte auf freie Community-GPU…',
        });

        while (!cancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 2200));
          if (cancelledRef.current) break;

          const status = await checkAiHordeJob(jobId, controller.signal);

          if (status.done) {
            const item: GeneratedArtwork = {
              id: crypto.randomUUID(),
              prompt: cleanPrompt,
              negativePrompt,
              engine,
              engineLabel: ENGINE_LABELS[engine],
              model: status.model || model,
              width: submitData.adjustedWidth,
              height: submitData.adjustedHeight,
              steps: submitData.adjustedSteps,
              cfgScale,
              sampler,
              seed: String(status.seed || 'unbekannt'),
              workerName: status.workerName,
              durationMs: Date.now() - startTime,
              createdAt: Date.now(),
              dataUrl: status.dataUrl,
              favorite: false,
            };
            await persistNewArtwork(item);
            break;
          }

          const isProcessing = Number(status.processing) > 0;
          setJobProgress({
            engine,
            jobId,
            phase: isProcessing ? 'processing' : 'queued',
            queuePosition: status.queuePosition,
            waitTime: status.waitTime,
            processing: status.processing,
            elapsedSec: (Date.now() - startTime) / 1000,
            statusMessage: isProcessing
              ? 'Bild wird auf Community-GPU berechnet…'
              : 'In Warteschlange der offenen GPUs…',
          });
        }
        return;
      }

      setJobProgress({
        engine,
        phase: 'processing',
        elapsedSec: 0,
        statusMessage: `Bild wird über ${ENGINE_LABELS[engine]} erzeugt…`,
      });

      const result =
        engine === 'pollinations'
          ? await generatePollinationsDirect({
              prompt: cleanPrompt,
              negativePrompt,
              model,
              width: preset.width,
              height: preset.height,
              seed: usedSeedInput,
              apiKey: settings.pollinationsKey,
              signal: controller.signal,
            })
          : engine === 'huggingface'
            ? await generateHuggingFaceDirect({
                prompt: cleanPrompt,
                negativePrompt,
                model,
                width: preset.width,
                height: preset.height,
                steps,
                cfgScale,
                apiKey: settings.huggingFaceToken,
                signal: controller.signal,
              })
            : await generateCustomServerDirect({
                endpointUrl: settings.customEndpointUrl,
                endpointType: settings.customEndpointType,
                apiKey: settings.customApiKey,
                prompt: cleanPrompt,
                negativePrompt,
                model: model || settings.customModelName,
                width: preset.width,
                height: preset.height,
                steps,
                cfgScale,
                sampler,
                seed: usedSeedInput,
                signal: controller.signal,
              });

      const item: GeneratedArtwork = {
        id: crypto.randomUUID(),
        prompt: cleanPrompt,
        negativePrompt,
        engine,
        engineLabel: ENGINE_LABELS[engine],
        model: result.model || model || 'Standard',
        width: result.width,
        height: result.height,
        steps,
        cfgScale,
        sampler,
        seed: String(result.seed || 'auto'),
        durationMs: Date.now() - startTime,
        createdAt: Date.now(),
        dataUrl: result.dataUrl,
        favorite: false,
      };
      await persistNewArtwork(item);
    } catch (err) {
      if (cancelledRef.current || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler bei der Generierung.');
    } finally {
      window.clearInterval(elapsedInterval);
      activeJobIdRef.current = null;
      setJobProgress(null);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await toggleFavoriteArtwork(id);
    if (!updated) return;
    setArtworks((prev) => prev.map((a) => (a.id === id ? updated : a)));
    if (activeArtwork?.id === id) {
      setActiveArtwork(updated);
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    await deleteArtwork(id);
    setArtworks((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (activeArtwork?.id === id) {
        setActiveArtwork(next[0] ?? null);
      }
      return next;
    });
  };

  const handleClearAll = async () => {
    await clearAllArtworks();
    setArtworks([]);
    setActiveArtwork(null);
  };

  const handleReuseInStudio = (artwork: GeneratedArtwork) => {
    setPrompt(artwork.prompt);
    setNegativePrompt(artwork.negativePrompt);
    setEngine(artwork.engine);
    setModel(artwork.model);
    setSteps(artwork.steps);
    setCfgScale(artwork.cfgScale);
    setSampler(artwork.sampler);
    setSeed(artwork.seed);
    setActiveArtwork(artwork);
    setActiveView('studio');
  };

  const handleSelectModelFromDirectory = (selectedEngine: EngineId, selectedModel: string) => {
    setEngine(selectedEngine);
    setModel(selectedModel);
    setActiveView('studio');
  };

  const handleResetStudio = () => {
    setPrompt('');
    setSeed('');
    setErrorMsg(null);
    setActiveArtwork(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] dark:bg-[#0D0F12] text-neutral-900 dark:text-neutral-100">
      <TopBar
        activeView={activeView}
        onNavigate={setActiveView}
        galleryCount={artworks.length}
        onResetStudio={handleResetStudio}
      />

      {activeView === 'studio' && (
        <StudioWorkspace
          prompt={prompt}
          onPromptChange={setPrompt}
          negativePrompt={negativePrompt}
          onNegativePromptChange={setNegativePrompt}
          engine={engine}
          onEngineChange={handleEngineChange}
          model={model}
          onModelChange={setModel}
          aspectId={aspectId}
          onAspectChange={setAspectId}
          steps={steps}
          onStepsChange={setSteps}
          cfgScale={cfgScale}
          onCfgScaleChange={setCfgScale}
          sampler={sampler}
          onSamplerChange={setSampler}
          seed={seed}
          onSeedChange={setSeed}
          catalog={catalog}
          settings={settings}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          jobProgress={jobProgress}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
          activeArtwork={activeArtwork}
          recentArtworks={artworks}
          onSelectArtwork={setActiveArtwork}
          onToggleFavorite={handleToggleFavorite}
          onGenerate={handleGenerate}
          onCancelJob={handleCancelJob}
          onOpenSettings={() => setActiveView('settings')}
        />
      )}

      {activeView === 'gallery' && (
        <GalleryView
          artworks={artworks}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteArtwork}
          onClearAll={handleClearAll}
          onReuseInStudio={handleReuseInStudio}
          onGoToStudio={() => setActiveView('studio')}
        />
      )}

      {activeView === 'models' && (
        <ModelsView
          catalog={catalog}
          loading={modelsLoading}
          error={modelsError}
          onRefresh={() => fetchModels(true)}
          onSelectModel={handleSelectModelFromDirectory}
        />
      )}

      {activeView === 'settings' && (
        <SettingsView
          settings={settings}
          onSaveSettings={handleSaveSettings}
        />
      )}
    </div>
  );
}
