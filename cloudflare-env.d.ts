interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;

  // Optional bindings (added when needed)
  KV?: KVNamespace;
  EMAIL_QUEUE?: Queue;

  // Secrets (set via wrangler secret or .dev.vars)
  AUTH_GOOGLE_ID: string;
  AUTH_GOOGLE_SECRET: string;
  AUTH_SECRET: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_CLOUD_PROJECT_ID: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;

  // LINE
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
}
