import { useMemo, useState } from 'react';
import { RefreshCw, Search, ArrowRight } from 'lucide-react';
import type { EngineId, ModelsCatalog } from '../types';

interface ModelsViewProps {
  catalog: ModelsCatalog | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectModel: (engine: EngineId, modelName: string) => void;
}

export function ModelsView({
  catalog,
  loading,
  error,
  onRefresh,
  onSelectModel,
}: ModelsViewProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'aihorde' | 'pollinations' | 'huggingface'>('aihorde');

  const filteredHorde = useMemo(() => {
    const list = catalog?.aihorde ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [catalog, query]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            Offene KI-Modelle
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Live-Verzeichnis der aktiven Open-Source-Diffusionsmodelle ohne Google-Abhängigkeit. Wähle ein Modell direkt für das Atelier aus.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Status aktualisieren</span>
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 self-start">
          <button
            type="button"
            onClick={() => setTab('aihorde')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'aihorde'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            AI Horde (Community GPU)
          </button>
          <button
            type="button"
            onClick={() => setTab('pollinations')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'pollinations'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Pollinations (Flux)
          </button>
          <button
            type="button"
            onClick={() => setTab('huggingface')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'huggingface'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Hugging Face
          </button>
        </div>

        {tab === 'aihorde' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Modell suchen…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26] dark:focus:border-[#F05A30]"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {tab === 'aihorde' && (
        <div className="mt-6 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-[#14171C]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-[#111317]">
                  <th className="py-3 px-4">Modell</th>
                  <th className="py-3 px-4">Schwerpunkt</th>
                  <th className="py-3 px-4 text-right">Aktive GPUs</th>
                  <th className="py-3 px-4 text-right">Wartezeit</th>
                  <th className="py-3 px-4 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                {loading && !catalog ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="h-12 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-10 ml-auto bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 ml-auto bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-7 w-24 ml-auto bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    </tr>
                  ))
                ) : filteredHorde.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Keine passenden aktiven Modelle gefunden.
                    </td>
                  </tr>
                ) : (
                  filteredHorde.map((model) => (
                    <tr
                      key={model.name}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-950 dark:text-neutral-100">
                          {model.name}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {model.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {model.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-neutral-800 dark:text-neutral-200">
                        {model.workers}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                        {model.eta} s
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectModel('aihorde', model.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:border-[#E04F26] dark:hover:border-[#F05A30] hover:text-[#E04F26] dark:hover:text-[#F05A30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Verwenden</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pollinations' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(catalog?.pollinations ?? []).map((model) => (
            <div
              key={model.name}
              className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C] flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-neutral-950 dark:text-neutral-100">
                    {model.label}
                  </h2>
                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {model.name}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  {model.description}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onSelectModel('pollinations', model.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:border-[#E04F26] dark:hover:border-[#F05A30] transition-colors cursor-pointer"
                >
                  <span>Im Atelier wählen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'huggingface' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(catalog?.huggingface ?? []).map((model) => (
            <div
              key={model.name}
              className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14171C] flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className="font-display text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  {model.label}
                </h2>
                <p className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {model.name}
                </p>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {model.description}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onSelectModel('huggingface', model.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:border-[#E04F26] dark:hover:border-[#F05A30] transition-colors cursor-pointer"
                >
                  <span>Im Atelier wählen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
