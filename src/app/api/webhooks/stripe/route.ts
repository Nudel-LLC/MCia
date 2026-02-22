import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { stripeWebhookSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // TODO: Verify Stripe signature with STRIPE_WEBHOOK_SECRET

  const parsed = stripeWebhookSchema.safeParse(await request.json());
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
