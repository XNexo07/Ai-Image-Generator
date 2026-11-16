import { useState } from 'react';
import { Check, ShieldCheck, Server, RefreshCw } from 'lucide-react';
import type { ConnectionSettings } from '../types';
import { fetchModelsCatalog } from '../utils/imageProviders';

interface SettingsViewProps {
  settings: ConnectionSettings;
  onSaveSettings: (next: ConnectionSettings) => void;
}

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [draft, setDraft] = useState<ConnectionSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    setHealthStatus(null);
    try {
      const catalog = await fetchModelsCatalog(true);
      setHealthStatus(
        `Direktverbindung aktiv (GitHub-Pages-kompatibel) · ${catalog.aihorde.length} AI-Horde-Modelle online · Keine Google-API aktiv`
      );
    } catch {
      setHealthStatus('Externe Netzwerkanfrage fehlgeschlagen – Offline-Modus („Lokal Prozedural“) bleibt jederzeit nutzbar.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
          Verbindung & Unabhängigkeit
        </h1>
        <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          Alle Bildgenerierungen laufen direkt aus dem Browser über offene HTTPS-Endpunkte (statisch kompatibel mit GitHub Pages) oder lokal im Browser – ohne Backend und ohne Google-APIs.
        </p>
      </div>

      {/* Verification block */}
      <div className="mt-6 p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
              100 % Statisch & ohne Google-API
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Direkte Endpunkte: <span className="font-mono">aihorde.net</span> · <span className="font-mono">pollinations.ai</span> · <span className="font-mono">router.huggingface.co</span> · <span className="font-mono">Lokal/Canvas</span>
            </p>
            {healthStatus && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-2">
                {healthStatus}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckConnection}
          disabled={checking}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>Status prüfen</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <section className="space-y-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-950 dark:text-neutral-100">
              1. AI Horde (Standard · Community GPU)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Funktioniert auf GitHub Pages sofort anonym ohne Schlüssel (bis 576×576 px). Mit einem kostenlosen AI-Horde-Konto sind höhere Auflösungen und kürzere Wartezeiten möglich.
            </p>
          </div>
          <div>
            <label htmlFor="aihorde-key" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              AI Horde API-Key (optional)
            </label>
            <input
              id="aihorde-key"
              type="password"
              value={draft.aiHordeKey}
              onChange={(e) => setDraft({ ...draft, aiHordeKey: e.target.value })}
              placeholder="Leer lassen für anonymen Modus (0000000000)"
              className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
            />
          </div>
        </section>

        <section className="space-y-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-950 dark:text-neutral-100">
              2. Hugging Face & Pollinations (optional)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Alle Schlüssel werden ausschließlich lokal in deinem Browser (<span className="font-mono">localStorage</span>) gespeichert.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hf-token" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Hugging Face Access Token
              </label>
              <input
                id="hf-token"
                type="password"
                value={draft.huggingFaceToken}
                onChange={(e) => setDraft({ ...draft, huggingFaceToken: e.target.value })}
                placeholder="hf_…"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
            <div>
              <label htmlFor="pol-key" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Pollinations Token (optional)
              </label>
              <input
                id="pol-key"
                type="password"
                value={draft.pollinationsKey}
                onChange={(e) => setDraft({ ...draft, pollinationsKey: e.target.value })}
                placeholder="Ohne Key: 1 Bild / 45 Sek."
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-neutral-500" />
            <h2 className="font-display text-base font-semibold text-neutral-950 dark:text-neutral-100">
              3. Eigener lokaler Stable-Diffusion-Server
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Für den Zugriff von GitHub Pages (HTTPS) auf Automatic1111/Forge starte deinen lokalen Server mit <span className="font-mono">--cors-allow-origins=*</span> (oder nutze eine HTTPS-Tunnel-URL).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="custom-url" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Basis-URL
              </label>
              <input
                id="custom-url"
                type="url"
                value={draft.customEndpointUrl}
                onChange={(e) => setDraft({ ...draft, customEndpointUrl: e.target.value })}
                placeholder="http://127.0.0.1:7860"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
            <div>
              <label htmlFor="custom-type" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Protokoll
              </label>
              <select
                id="custom-type"
                value={draft.customEndpointType}
                onChange={(e) => setDraft({ ...draft, customEndpointType: e.target.value as 'a1111' | 'openai' })}
                className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
              >
                <option value="a1111">Automatic1111 / Forge</option>
                <option value="openai">OpenAI-kompatibel</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="custom-model" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Modellname (optional)
              </label>
              <input
                id="custom-model"
                type="text"
                value={draft.customModelName}
                onChange={(e) => setDraft({ ...draft, customModelName: e.target.value })}
                placeholder="z. B. flux1-dev"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
            <div>
              <label htmlFor="custom-key" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Bearer-Token (optional)
              </label>
              <input
                id="custom-key"
                type="password"
                value={draft.customApiKey}
                onChange={(e) => setDraft({ ...draft, customApiKey: e.target.value })}
                placeholder="Nur falls Server Auth nutzt"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" />
              Einstellungen lokal gespeichert
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium rounded-md bg-[#E04F26] hover:bg-[#C83F1A] dark:bg-[#F05A30] dark:hover:bg-[#D94A22] text-white transition-colors cursor-pointer"
          >
            Einstellungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}
