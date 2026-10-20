import { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';

/** Applies the persisted theme + density to <html>. */
export function ThemeSync() {
  const theme = useUiStore((state) => state.theme);
  const density = useUiStore((state) => state.density);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.density = density;
    root.style.colorScheme = theme;
  }, [theme, density]);

  return null;
}

export default ThemeSync;
