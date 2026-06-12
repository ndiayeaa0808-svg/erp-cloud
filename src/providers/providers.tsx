"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/pwa/register-sw";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SyncProvider } from "@/lib/sync/sync-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SyncProvider>
          {children}
          <Toaster richColors position="top-right" />
          <RegisterSW />
          <OfflineBanner />
        </SyncProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
