import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../../store';
import { useResolvedTheme, type ThemePreference } from '../../../lib/theme';

// Fixed colours on purpose: each card previews its own theme, not the active one.
const PREVIEW = {
  dark: { bg: '#0a0a0f', sidebar: '#12121a', panel: '#1a1a26', line: '#2a2a3a', text: '#e2e8f0', muted: '#475569' },
  light: { bg: '#f4f5fa', sidebar: '#ffffff', panel: '#ffffff', line: '#e2e5ef', text: '#1e293b', muted: '#cbd5e1' },
};

function MiniDashboard({ palette }: { palette: (typeof PREVIEW)['dark'] }) {
  return (
    <div className="flex h-full w-full" style={{ background: palette.bg }}>
      <div className="w-1/4 h-full p-1.5 space-y-1" style={{ background: palette.sidebar, borderRight: `1px solid ${palette.line}` }}>
        <div className="h-2 w-2 rounded-sm bg-nexus-gradient" />
        <div className="h-1 rounded-full" style={{ background: '#6366f1', opacity: 0.8 }} />
        <div className="h-1 rounded-full" style={{ background: palette.muted }} />
        <div className="h-1 rounded-full" style={{ background: palette.muted }} />
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="h-1.5 w-1/2 rounded-full" style={{ background: palette.text, opacity: 0.8 }} />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 rounded" style={{ background: palette.panel, border: `1px solid ${palette.line}` }} />
          ))}
        </div>
        <div className="h-8 rounded flex items-end gap-0.5 p-1" style={{ background: palette.panel, border: `1px solid ${palette.line}` }}>
          {[40, 70, 50, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i % 2 ? '#22d3ee' : '#6366f1' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const OPTIONS: { id: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', description: 'Bright and crisp for well-lit spaces', icon: Sun },
  { id: 'dark', label: 'Dark', description: 'Easy on the eyes, the NexusRAG classic', icon: Moon },
  { id: 'system', label: 'System', description: 'Matches your operating system', icon: Laptop },
];

export default function AppearanceSettings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const resolved = useResolvedTheme();

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const selected = theme === opt.id;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(opt.id)}
              className={`group text-left rounded-xl border-2 p-3 transition-all duration-200 bg-nexus-panel hover:-translate-y-0.5 ${
                selected
                  ? 'border-nexus-accent shadow-[0_0_0_4px_rgb(var(--nx-accent)/0.12)]'
                  : 'border-nexus-border hover:border-nexus-accent/40'
              }`}
            >
              <div className="relative h-24 rounded-lg overflow-hidden border border-nexus-border">
                {opt.id === 'system' ? (
                  <div className="flex h-full">
                    <div className="w-1/2 overflow-hidden">
                      <div className="w-[200%] h-full"><MiniDashboard palette={PREVIEW.light} /></div>
                    </div>
                    <div className="w-1/2 overflow-hidden relative">
                      <div className="w-[200%] h-full -translate-x-1/2"><MiniDashboard palette={PREVIEW.dark} /></div>
                    </div>
                  </div>
                ) : (
                  <MiniDashboard palette={PREVIEW[opt.id]} />
                )}
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-nexus-accent flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <opt.icon className={`w-4 h-4 ${selected ? 'text-nexus-accent-light' : 'text-nexus-muted'}`} />
                <span className={`font-medium text-sm ${selected ? 'text-nexus-heading' : 'text-nexus-text'}`}>{opt.label}</span>
              </div>
              <p className="text-xs text-nexus-muted mt-1">{opt.description}</p>
            </button>
          );
        })}
      </div>

      {theme === 'system' && (
        <p className="text-sm text-nexus-muted">
          Your system is currently using <span className="text-nexus-heading font-medium">{resolved}</span> mode.
          NexusRAG will switch automatically when it changes.
        </p>
      )}
    </div>
  );
}
