import { getCloudflareContext } from "@opennextjs/cloudflare";

// Synchronous DB access — works within Cloudflare Workers request handlers
export function getDB(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as CloudflareEnv).DB;
}

// Async DB access — works in all contexts including SSG
export async function getDBAsync(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as CloudflareEnv).DB;
}

// Get the full Cloudflare environment (for API keys, secrets, etc.)
export function getEnv(): CloudflareEnv {
  const { env } = getCloudflareContext();
  return env as unknown as CloudflareEnv;
}
