import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getDB(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as CloudflareEnv).DB;
}

export async function getDBAsync(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as CloudflareEnv).DB;
}
