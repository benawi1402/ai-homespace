import { create } from 'zustand';

interface DashboardState {
  focusedPanelId: string | null;
  setFocusedPanel: (id: string | null) => void;
  toggleFocusedPanel: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  focusedPanelId: null,

  setFocusedPanel: (id) => set({ focusedPanelId: id }),

  toggleFocusedPanel: (id) => {
    const current = get().focusedPanelId;
    set({ focusedPanelId: current === id ? null : id });
  },
}));
