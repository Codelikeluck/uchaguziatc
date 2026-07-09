const KV_ENABLED = !!(process.env.KV_URL || process.env.KV_REST_API_URL);

let kv: any = null;

async function getKv() {
  if (!KV_ENABLED) return null;
  if (kv) return kv;
  try {
    const { createClient } = await import('@vercel/kv');
    const restUrl = process.env.KV_REST_API_URL;
    const restToken = process.env.KV_REST_API_TOKEN;
    if (restUrl && restToken) {
      kv = createClient({ url: restUrl, token: restToken });
    } else if (process.env.KV_URL) {
      kv = createClient({ url: process.env.KV_URL, token: '' });
    } else {
      return null;
    }
    await kv.ping();
    return kv;
  } catch (e) {
    console.error('KV connection failed (non-fatal, falling back to in-memory):', e);
    return null;
  }
}

export async function kvSet(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  const client = await getKv();
  if (!client) return false;
  try {
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      await client.set(key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}

export async function kvGet<T = any>(key: string): Promise<T | null> {
  const client = await getKv();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (typeof raw === 'string') return JSON.parse(raw);
    return raw as T;
  } catch {
    return null;
  }
}

export async function kvDel(key: string): Promise<boolean> {
  const client = await getKv();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function kvExists(key: string): Promise<boolean> {
  const client = await getKv();
  if (!client) return false;
  try {
    return (await client.exists(key)) === 1;
  } catch {
    return false;
  }
}
