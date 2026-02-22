import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { agencies } from "@/db/schema";
import { createAgencySchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const results = await db
    .select()
    .from(agencies)
    .where(eq(agencies.userId, session.user.id))
    .orderBy(desc(agencies.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createAgencySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const [agency] = await db
    .insert(agencies)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      emailDomain: parsed.data.emailDomain,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(agency, { status: 201 });
}
