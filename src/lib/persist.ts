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
  const snapshots: { source: string; data: Record<string, any>; version: number }[] = [];

  // Read file
  const fileData = loadDataSync();
  if (fileData) {
    console.log(`loadData: file snapshot (version=${fileData._version || 0}, students=${fileData.students?.length || 0})`);
    snapshots.push({ source: 'file', data: fileData, version: fileData._version || 0 });
  }

  // Read KV
  const kvData = await kvGet<Record<string, any>>(KV_KEY);
  if (kvData) {
    console.log(`loadData: KV snapshot (version=${kvData._version || 0}, students=${kvData.students?.length || 0})`);
    snapshots.push({ source: 'kv', data: kvData, version: kvData._version || 0 });
  }

  // Read Neon
  if (process.env.DATABASE_URL) {
    if (!neonInited) {
      neonInited = await neonInitTables();
    }
    const neonData = await neonLoadSnapshot();
    if (neonData) {
      console.log(`loadData: neon snapshot (version=${neonData._version || 0}, students=${neonData.students?.length || 0})`);
      neonSyncAll(neonData);
      snapshots.push({ source: 'neon', data: neonData, version: neonData._version || 0 });
    }
  }

  if (snapshots.length === 0) { return null; }

  // Pick the highest version — prevents stale data from any source
  snapshots.sort((a, b) => b.version - a.version);
  const best = snapshots[0];
  console.log(`loadData: picked ${best.source} (version=${best.version})`);
  return best.data;
}

export async function saveData(data: Record<string, any>): Promise<void> {
  let savedToNeon = false;

  if (process.env.DATABASE_URL) {
    if (!neonInited) {
      neonInited = await neonInitTables();
    }
    console.log(`saveData: neonInited=${neonInited}, trying neonSaveSnapshot`);
    const neonOk = await neonSaveSnapshot(data);
    console.log(`saveData: neonSaveSnapshot returned ${neonOk}`);
    if (neonOk) {
      neonSyncAll(data);
      savedToNeon = true;
    }
  }

  const kvOk = await kvSet(KV_KEY, data);
  console.log(`saveData: kvSet returned ${kvOk}`);

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmpPath = DATA_FILE + '.tmp.' + Date.now();
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmpPath, DATA_FILE);
    console.log('saveData: file written');
  } catch (err) {
    console.error('File fallback write failed:', err);
  }

  console.log(`saveData: complete (neon=${savedToNeon}, kv=${kvOk}, file=true)`);
}
