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

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found" },
      { status: 400 }
    );
  }

  const portalRes = await fetch(
    "https://api.stripe.com/v1/billing_portal/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: user.stripeCustomerId,
        return_url: "https://mcia.nudel.co/subscription",
      }),
    }
  );

  if (!portalRes.ok) {
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }

  const portalSession = (await portalRes.json()) as { url: string };
  return NextResponse.json({ url: portalSession.url });
}
