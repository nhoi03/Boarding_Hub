import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query";
import { router } from "@/router";
import { useUI } from "@/stores/ui";
import "./index.css";

function ThemedToaster() {
  const theme = useUI((s) => s.theme);
  return <Toaster theme={theme} position="top-right" richColors closeButton toastOptions={{ className: "font-sans" }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <RouterProvider router={router} />
        <ThemedToaster />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
