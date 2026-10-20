import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Layout + preference state that has no business living on the server. */
export const useUiStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      rightPanelOpen: true,
      theme: 'light', // light | dark
      density: 'comfortable', // comfortable | compact

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: Boolean(value) }),
      setMobileNav: (value) => set({ mobileNavOpen: Boolean(value) }),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setDensity: (density) => set({ density }),
    }),
    {
      name: 'bca-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelOpen: state.rightPanelOpen,
        theme: state.theme,
        density: state.density,
      }),
    }
  )
);

export const uiStore = useUiStore;
export default useUiStore;

