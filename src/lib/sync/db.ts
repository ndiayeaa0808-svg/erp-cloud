import Dexie, { type Table } from "dexie";

export interface PendingWrite {
  id?: number;
  table: string;
  action: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  entityId?: string;
  createdAt: string;
  retries: number;
  lastError?: string;
  lastErrorAt?: string;
}

export interface CachedProduct {
  id: string;
  name: string;
  retail: number;
  wholesale: number;
  cost: number;
  stock: number;
  threshold: number;
  unit: string;
  cat: string;
  photo?: string;
  ref?: string;
  barcode?: string;
  supplier?: string;
  desc?: string;
  updatedAt: string;
}

export interface CachedClient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  updatedAt: string;
}

export interface SyncMeta {
  id: string;
  lastSyncTime: string;
  processedIds: string[];
}

class LocalDB extends Dexie {
  pendingWrites!: Table<PendingWrite>;
  products!: Table<CachedProduct>;
  clients!: Table<CachedClient>;
  syncMeta!: Table<SyncMeta>;

  constructor() {
    super("erp-local");
    this.version(2).stores({
      pendingWrites: "++id, table, action, createdAt, retries",
      products: "id, name, cat, updatedAt",
      clients: "id, name, updatedAt",
      syncMeta: "id",
    }).upgrade((tx) => {
      tx.table("pendingWrites").toCollection().modify((w) => {
        w.lastError = undefined;
        w.lastErrorAt = undefined;
      });
    });
    this.version(1).stores({
      pendingWrites: "++id, table, action, createdAt",
      products: "id, name, cat, updatedAt",
      clients: "id, name, updatedAt",
    });
  }
}

export const localDB = typeof window !== "undefined" ? new LocalDB() : null;

export async function addPendingWrite(
  table: string,
  action: "create" | "update" | "delete",
  payload: Record<string, unknown>,
  entityId?: string
) {
  if (!localDB) return;
  await localDB.pendingWrites.add({
    table,
    action,
    payload,
    entityId,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  if (!localDB) return [];
  return localDB.pendingWrites.orderBy("createdAt").toArray();
}

export async function removePendingWrite(id: number) {
  if (!localDB) return;
  await localDB.pendingWrites.delete(id);
}

export async function updatePendingWriteRetry(id: number, error: string) {
  if (!localDB) return;
  const existing = await localDB.pendingWrites.get(id);
  if (!existing) return;
  await localDB.pendingWrites.update(id, {
    retries: (existing.retries || 0) + 1,
    lastError: error,
    lastErrorAt: new Date().toISOString(),
  });
}

export async function clearAllPendingWrites() {
  if (!localDB) return;
  await localDB.pendingWrites.clear();
}

export async function cleanupStaleWrites(maxAgeDays = 7) {
  if (!localDB) return;
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
  await localDB.pendingWrites.where("createdAt").below(cutoff).delete();
}

export async function cacheProducts(products: CachedProduct[]) {
  if (!localDB) return;
  await localDB.products.bulkPut(products);
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  if (!localDB) return [];
  return localDB.products.toArray();
}

export async function cacheClients(clients: CachedClient[]) {
  if (!localDB) return;
  await localDB.clients.bulkPut(clients);
}

export async function getCachedClients(): Promise<CachedClient[]> {
  if (!localDB) return [];
  return localDB.clients.toArray();
}

export async function setLastSyncTime() {
  if (!localDB) return;
  const existing = await localDB.syncMeta.get("sync_meta");
  if (existing) {
    await localDB.syncMeta.update("sync_meta", { lastSyncTime: new Date().toISOString() });
  } else {
    await localDB.syncMeta.add({ id: "sync_meta", lastSyncTime: new Date().toISOString(), processedIds: [] });
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  if (!localDB) return null;
  const meta = await localDB.syncMeta.get("sync_meta");
  return meta?.lastSyncTime ?? null;
}

export async function addProcessedId(id: string) {
  if (!localDB) return;
  const existing = await localDB.syncMeta.get("sync_meta");
  if (existing) {
    const ids = existing.processedIds || [];
    ids.push(id);
    if (ids.length > 1000) ids.splice(0, ids.length - 1000);
    await localDB.syncMeta.update("sync_meta", { processedIds: ids });
  } else {
    await localDB.syncMeta.add({ id: "sync_meta", lastSyncTime: new Date().toISOString(), processedIds: [id] });
  }
}

export async function isProcessedId(id: string): Promise<boolean> {
  if (!localDB) return false;
  const meta = await localDB.syncMeta.get("sync_meta");
  return meta?.processedIds?.includes(id) ?? false;
}
