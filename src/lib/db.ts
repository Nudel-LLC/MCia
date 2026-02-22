/**
 * Drizzle ORM client for Cloudflare D1
 *
 * Cloudflare Workers では D1 バインディングがリクエストコンテキスト内でのみ利用可能。
 * `getDb()` は各ルートハンドラー内で呼び出す（モジュールスコープ不可）。
 */

import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

export type Database = DrizzleD1Database<typeof schema>;

/** リクエストハンドラー内で Drizzle クライアントを取得 */
export function getDb(): Database {
  const { env } = getCloudflareContext();
  return drizzle((env as unknown as CloudflareEnv).DB, { schema });
}

/** async 版 — SSG / ミドルウェア等でも安全に使用可能 */
export async function getDbAsync(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle((env as unknown as CloudflareEnv).DB, { schema });
}

/** Cloudflare 環境変数へのアクセス */
export function getEnv(): CloudflareEnv {
  const { env } = getCloudflareContext();
  return env as unknown as CloudflareEnv;
}
