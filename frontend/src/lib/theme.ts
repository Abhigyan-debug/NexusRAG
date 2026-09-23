import { useEffect, useSyncExternalStore } from 'react';
import { useAppStore } from '../store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null;

function subscribeSystem(callback: () => void) {
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}

function getSystemTheme(): ResolvedTheme {
  return media?.matches ? 'light' : 'dark';
}

/** The theme actually on screen, following the OS when the preference is "system". */
export function useResolvedTheme(): ResolvedTheme {
  const preference = useAppStore((s) => s.theme);
  const system = useSyncExternalStore(subscribeSystem, getSystemTheme, () => 'dark' as const);
  return preference === 'system' ? system : preference;
}

/** Mount once: keeps <html data-theme> in sync with the preference. */
export function useApplyTheme() {
  const resolved = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme === resolved) return;

    // Cross-fade colours on an actual switch, but not on first paint
    const animate = root.dataset.theme !== undefined;
    if (animate) root.classList.add('theme-transition');
    root.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'light' ? '#f4f5fa' : '#0a0a0f');

    if (!animate) return;
    const timer = window.setTimeout(() => root.classList.remove('theme-transition'), 300);
    return () => window.clearTimeout(timer);
  }, [resolved]);
}
