let memory = new Map<string, string>();

// Minimal REST-based Upstash client
async function upstashGet(key: string): Promise<string | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memory.get(key) ?? null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.result ?? null;
}

async function upstashSet(key: string, value: string, ttlSec?: number): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    memory.set(key, value);
    if (ttlSec) setTimeout(() => memory.delete(key), ttlSec * 1000).unref?.();
    return;
  }
  const params = ttlSec ? `EX/${ttlSec}` : "";
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export const kv = {
  get: upstashGet,
  set: upstashSet,
};
