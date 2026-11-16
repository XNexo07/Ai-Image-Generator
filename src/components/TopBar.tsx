import type { AppView } from '../types';

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  galleryCount: number;
  onResetStudio: () => void;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'studio', label: 'Atelier' },
  { id: 'gallery', label: 'Galerie' },
  { id: 'models', label: 'Modelle' },
  { id: 'settings', label: 'Verbindung' },
];

export function TopBar({ activeView, onNavigate, galleryCount, onResetStudio }: TopBarProps) {
  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111317] px-4 sm:px-6 flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single-element brand wordmark */}
      <button
        type="button"
        onClick={() => onNavigate('studio')}
        className="font-display text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E04F26] cursor-pointer"
      >
        Bildwerk
      </button>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav aria-label="Hauptnavigation" className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const label = item.id === 'gallery' && galleryCount > 0
            ? `${item.label} (${galleryCount})`
            : item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E04F26] ${
                isActive
                  ? 'text-neutral-950 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span className="tabular-nums">{label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-[#E04F26] dark:bg-[#F05A30]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => {
            onResetStudio();
            onNavigate('studio');
          }}
          className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E04F26]"
        >
          Neues Motiv
        </button>
      </div>
    </header>
  );
}
