"use client";

const isElectron = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

export function isOnlineSync(): boolean {
  if (typeof navigator === "undefined") return true;
  if (isElectron) return true;
  return navigator.onLine;
}

export async function isOnline(): Promise<boolean> {
  return isOnlineSync();
}
