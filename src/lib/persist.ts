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
    console.log(`loadData: neonInited=${neonInited}, trying neonLoadSnapshot`);
    const neonData = await neonLoadSnapshot();
    if (neonData) {
      console.log(`loadData: neon snapshot found (students: ${neonData.students?.length || 0})`);
      neonSyncAll(neonData);
      return neonData;
    }
    console.log('loadData: neon returned null, falling through');
  } else {
    console.log('loadData: DATABASE_URL not set, skipping neon');
  }

  console.log('loadData: trying KV');
  const kvData = await kvGet<Record<string, any>>(KV_KEY);
  if (kvData) {
    console.log('loadData: KV found data');
    return kvData;
  }

  console.log('loadData: trying file');
  return loadDataSync();
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
