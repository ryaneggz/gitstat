"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

/**
 * Toaster wrapper that reads theme from context
 */
function ToasterWithTheme() {
  const { theme, mounted } = useTheme();

  return (
    <Toaster
      theme={mounted ? theme : "light"}
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-card border border-border",
          title: "text-foreground",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <ToasterWithTheme />
      </SessionProvider>
    </ThemeProvider>
  );
}
