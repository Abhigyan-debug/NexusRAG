import { Laptop, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store';
import { useResolvedTheme, type ThemePreference } from '../../lib/theme';

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light theme', icon: Sun },
  { id: 'dark', label: 'Dark theme', icon: Moon },
  { id: 'system', label: 'Use system theme', icon: Laptop },
];

/** Three-way segmented switch: light / dark / system. */
export function ThemeSegmented({ className = '' }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <div role="radiogroup" aria-label="Theme" className={`flex p-0.5 rounded-lg bg-nexus-bg border border-nexus-border ${className}`}>
      {OPTIONS.map((opt) => {
        const selected = theme === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.id)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all duration-200 ${
              selected
                ? 'bg-nexus-panel text-nexus-accent-light shadow-sm ring-1 ring-nexus-border'
                : 'text-nexus-muted hover:text-nexus-heading'
            }`}
          >
            <opt.icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Single icon button that flips between light and dark. */
export function ThemeIconToggle() {
  const resolved = useResolvedTheme();
  const setTheme = useAppStore((s) => s.setTheme);
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-nexus-muted hover:text-nexus-heading hover:bg-nexus-overlay/5 transition-colors"
    >
      {resolved === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
