import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, getEnv } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getEnv();
  const db = getDb();

  // ユーザーの Stripe customer ID を取得（なければ作成）
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    // Stripe API で Customer を作成
    const customerRes = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: user.email ?? "",
        metadata: JSON.stringify({ userId: session.user.id }),
      }),
    });

    if (!customerRes.ok) {
      return NextResponse.json(
        { error: "Failed to create Stripe customer" },
        { status: 500 }
      );
    }

    const customer = (await customerRes.json()) as { id: string };
    customerId = customer.id;

    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() })
      .where(eq(users.id, session.user.id));
  }

  // Checkout Session を作成
  const checkoutRes = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        "line_items[0][price]": env.STRIPE_PRICE_ID,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${new URL("/subscription?success=true", "https://mcia.nudel.co").href}`,
        cancel_url: `${new URL("/subscription?canceled=true", "https://mcia.nudel.co").href}`,
      }),
    }
  );

  if (!checkoutRes.ok) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }

  const checkoutSession = (await checkoutRes.json()) as { url: string };
  return NextResponse.json({ url: checkoutSession.url });
}
