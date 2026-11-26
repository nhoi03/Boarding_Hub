import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ID } from "@/api/types";

type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  propertyId: ID | null;
  commandOpen: boolean;
  mobileNavOpen: boolean;
  toggleTheme: (origin?: { x: number; y: number }) => void;
  toggleSidebar: () => void;
  setPropertyId: (id: ID | null) => void;
  setCommandOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("bh-theme", theme);
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      sidebarCollapsed: false,
      propertyId: null,
      commandOpen: false,
      mobileNavOpen: false,
      toggleTheme: (origin) => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
        if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          applyTheme(next);
          set({ theme: next });
          return;
        }
        const x = origin?.x ?? innerWidth - 40;
        const y = origin?.y ?? 40;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const t = doc.startViewTransition(() => {
          applyTheme(next);
          set({ theme: next });
        });
        t.ready.then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 550, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
          );
        });
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPropertyId: (propertyId) => set({ propertyId }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: "bh-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, propertyId: s.propertyId }),
    },
  ),
);
