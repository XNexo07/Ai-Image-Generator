import { useMemo, useState } from 'react';
import { Download, Heart, Trash2, Search, ArrowUpRight, X, Image as ImageIcon } from 'lucide-react';
import type { GeneratedArtwork } from '../types';

interface GalleryViewProps {
  artworks: GeneratedArtwork[];
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReuseInStudio: (artwork: GeneratedArtwork) => void;
  onGoToStudio: () => void;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function GalleryView({
  artworks,
  onToggleFavorite,
  onDelete,
  onClearAll,
  onReuseInStudio,
  onGoToStudio,
}: GalleryViewProps) {
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [inspected, setInspected] = useState<GeneratedArtwork | null>(null);

  const filtered = useMemo(() => {
    return artworks.filter((item) => {
      if (filter === 'favorites' && !item.favorite) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.engineLabel.toLowerCase().includes(q)
      );
    });
  }, [artworks, filter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            Gespeicherte Werke
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Lokal im Browser (<span className="font-mono">IndexedDB</span>) gesichert · <span className="tabular-nums">{artworks.length}</span> {artworks.length === 1 ? 'Bild' : 'Bilder'}
          </p>
        </div>

        {artworks.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {confirmClear ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                >
                  Endgültig leeren
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Galerie leeren</span>
              </button>
            )}
          </div>
        )}
      </div>

      {artworks.length === 0 ? (
        <div className="mt-12 py-16 px-6 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-800 text-center max-w-lg mx-auto">
          <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Noch keine Bilder gespeichert
          </h2>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            Jedes im Atelier erstellte Bild wird automatisch hier mit seinem Prompt, Seed und Modell gesichert.
          </p>
          <button
            type="button"
            onClick={onGoToStudio}
            className="mt-5 px-4 py-2 text-sm font-medium rounded-md bg-[#E04F26] hover:bg-[#C83F1A] dark:bg-[#F05A30] dark:hover:bg-[#D94A22] text-white transition-colors cursor-pointer"
          >
            Erstes Bild im Atelier erstellen
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 self-start">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Alle ({artworks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('favorites')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === 'favorites'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Favoriten ({artworks.filter((a) => a.favorite).length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Prompt oder Modell durchsuchen…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white dark:bg-[#14171C] border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E04F26]"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-10 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Keine Bilder passen zu diesem Filter.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-[#14171C] flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setInspected(item)}
                    className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-zoom-in block"
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <p className="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                        {item.prompt}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                        <span className="truncate max-w-[140px]">{item.model}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.width}×{item.height}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.id)}
                          aria-label={item.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            item.favorite
                              ? 'text-[#E04F26] dark:text-[#F05A30]'
                              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${item.favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDataUrl(item.dataUrl, `bildwerk-${item.seed}.png`)}
                          aria-label="Bild herunterladen"
                          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label="Bild löschen"
                          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onReuseInStudio(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-[#E04F26] dark:hover:text-[#F05A30] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Übernehmen</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox Detail Modal */}
      {inspected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setInspected(null)}
        >
          <div
            className="max-w-5xl w-full bg-white dark:bg-[#14171C] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-5 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lg:col-span-3 bg-neutral-100 dark:bg-[#0D0F12] flex items-center justify-center p-4 overflow-hidden">
              <img
                src={inspected.dataUrl}
                alt={inspected.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>

            <div className="lg:col-span-2 p-6 flex flex-col justify-between gap-6 overflow-y-auto">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                    Bilddetails
                  </h2>
                  <button
                    type="button"
                    onClick={() => setInspected(null)}
                    aria-label="Detailansicht schließen"
                    className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="mt-4 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {inspected.prompt}
                </p>

                {inspected.negativePrompt && (
                  <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Negativ-Prompt:</span>{' '}
                    {inspected.negativePrompt}
                  </div>
                )}

                <dl className="mt-6 space-y-2.5 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-4">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Engine</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100 text-right">{inspected.engineLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Modell</dt>
                    <dd className="font-mono text-neutral-900 dark:text-neutral-100 text-right">{inspected.model}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Auflösung</dt>
                    <dd className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{inspected.width} × {inspected.height} px</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Seed</dt>
                    <dd className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{inspected.seed}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Schritte / CFG</dt>
                    <dd className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{inspected.steps} / {inspected.cfgScale}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Rechenzeit</dt>
                    <dd className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{(inspected.durationMs / 1000).toFixed(1)} s</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => downloadDataUrl(inspected.dataUrl, `bildwerk-${inspected.seed}.png`)}
                  className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-[#E04F26] hover:bg-[#C83F1A] dark:bg-[#F05A30] dark:hover:bg-[#D94A22] text-white transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Bild herunterladen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReuseInStudio(inspected);
                    setInspected(null);
                  }}
                  className="w-full py-2 px-4 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Parameter ins Atelier laden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
