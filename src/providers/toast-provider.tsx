"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme as "light" | "dark" | "system"}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "font-sans rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl",
          title: "font-semibold text-sm",
          description: "text-xs text-muted-foreground",
          actionButton:
            "bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-3 py-1 text-xs font-medium",
          cancelButton:
            "bg-muted text-muted-foreground rounded-lg px-3 py-1 text-xs",
        },
      }}
    />
  );
}
