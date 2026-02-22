import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// POST /api/webhooks/stripe - Stripe Webhook
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // TODO: Verify Stripe signature with STRIPE_WEBHOOK_SECRET

  const body = await request.json();
  const { type, data } = body;

  const db = getDB();

  switch (type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = data.object;
      const status = subscription.status === "active" ? "active" : "inactive";
      await db
        .prepare(
          "UPDATE users SET subscription_status = ?, updated_at = ? WHERE stripe_customer_id = ?"
        )
        .bind(status, new Date().toISOString(), subscription.customer)
        .run();
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = data.object;
      await db
        .prepare(
          "UPDATE users SET subscription_status = 'inactive', updated_at = ? WHERE stripe_customer_id = ?"
        )
        .bind(new Date().toISOString(), subscription.customer)
        .run();
      break;
    }
  }

  return NextResponse.json({ received: true });
}
