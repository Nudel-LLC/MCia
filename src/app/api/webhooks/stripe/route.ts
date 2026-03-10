import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, getEnv } from "@/lib/db";
import { users } from "@/db/schema";
import { stripeWebhookSchema } from "@/lib/validators";

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Stripe signature format: t=timestamp,v1=hash
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !v1) return false;

  // Reject if timestamp is older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === v1;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const env = getEnv();
  const rawBody = await request.text();

  const valid = await verifyStripeSignature(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = stripeWebhookSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, data } = parsed.data;
  const db = getDb();
  const subscription = data.object;

  switch (type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const status = subscription.status === "active" ? "active" : "inactive";
      await db
        .update(users)
        .set({
          subscriptionStatus: status as "active" | "inactive",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.stripeCustomerId, subscription.customer));
      break;
    }

    case "customer.subscription.deleted": {
      await db
        .update(users)
        .set({
          subscriptionStatus: "inactive",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.stripeCustomerId, subscription.customer));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
