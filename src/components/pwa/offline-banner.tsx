"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { isOnlineSync } from "@/lib/is-online";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setOffline(!isOnlineSync());
    setShow(!isOnlineSync());
    if (isOnlineSync()) return;
    const on = () => { setOffline(false); setTimeout(() => setShow(false), 2000); };
    const off = () => { setOffline(true); setShow(true); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (offline) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
        <WifiOff className="h-4 w-4" />
        Mode hors-ligne — les données ne sont pas à jour
      </div>
    );
  }

  if (show) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg animate-in slide-in-from-bottom-2">
        <Wifi className="h-4 w-4" />
        <RefreshCw className="h-3 w-3 animate-spin" />
        Connecté — synchronisation...
      </div>
    );
  }

  return null;
}
