import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import path from 'path';
import { kvSet, kvGet } from './kv';
import { neonSaveSnapshot, neonLoadSnapshot, neonInitTables, neonSyncAll } from './neon';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/data'
  : path.join(process.cwd(), 'data');

const DATA_FILE = path.join(DATA_DIR, 'db.json');
const KV_KEY = 'db:snapshot';

let neonInited = false;

export function loadDataSync(): Record<string, any> | null {
  try {
    if (!existsSync(DATA_FILE)) return null;
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export async function loadData(): Promise<Record<string, any> | null> {
  if (process.env.DATABASE_URL) {
    if (!neonInited) {
      neonInited = await neonInitTables();
    }
    // Always try to load the snapshot, even if table init failed
    // (the snapshots table may already exist from a previous run)
    const neonData = await neonLoadSnapshot();
    if (neonData) {
      neonSyncAll(neonData);
      return neonData;
    }
  }

  const kvData = await kvGet<Record<string, any>>(KV_KEY);
  if (kvData) return kvData;

  return loadDataSync();
}

export async function saveData(data: Record<string, any>): Promise<void> {
  let savedToNeon = false;

  if (process.env.DATABASE_URL) {
    if (!neonInited) {
      neonInited = await neonInitTables();
    }
    // Always try to save, even if table init failed
    // (the snapshots table may already exist from a previous run)
    const neonOk = await neonSaveSnapshot(data);
    if (neonOk) {
      neonSyncAll(data);
      savedToNeon = true;
    }
  }

  const kvOk = await kvSet(KV_KEY, data);

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmpPath = DATA_FILE + '.tmp.' + Date.now();
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmpPath, DATA_FILE);
  } catch (err) {
    console.error('File fallback write failed:', err);
  }

  if (!savedToNeon && !kvOk) {
    console.warn('saveData: all remote backends failed, data only on local file');
  }
}
