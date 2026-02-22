interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  EMAIL_QUEUE: Queue;
  ASSETS: Fetcher;

  // Secrets (set via wrangler secret or .dev.vars)
  AUTH_GOOGLE_ID: string;
  AUTH_GOOGLE_SECRET: string;
  AUTH_SECRET: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
}
