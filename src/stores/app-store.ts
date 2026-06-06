import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  shopName: string;
  currency: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setShopName: (name: string) => void;
  setCurrency: (currency: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  shopName: "Boutique",
  currency: "FCFA",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setShopName: (shopName) => set({ shopName }),
  setCurrency: (currency) => set({ currency }),
}));
