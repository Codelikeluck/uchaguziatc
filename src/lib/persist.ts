import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/data'
  : path.join(process.cwd(), 'data');

const DATA_FILE = path.join(DATA_DIR, 'db.json');

let writeQueue: Promise<void> = Promise.resolve();

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tmpPath = filePath + '.tmp.' + Date.now();
  await fs.writeFile(tmpPath, data, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

export async function saveData(data: Record<string, any>): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await atomicWrite(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save data:', err);
    }
  });
  await writeQueue;
}

export async function loadData(): Promise<Record<string, any> | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function persistKV(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  if (!(process.env.KV_URL || process.env.KV_REST_API_URL)) return false;
  try {
    const { kvSet } = await import('./kv');
    return kvSet(key, value, ttlSeconds);
  } catch {
    return false;
  }
}

export async function loadKV<T = any>(key: string): Promise<T | null> {
  if (!(process.env.KV_URL || process.env.KV_REST_API_URL)) return null;
  try {
    const { kvGet } = await import('./kv');
    return kvGet<T>(key);
  } catch {
    return null;
  }
}
