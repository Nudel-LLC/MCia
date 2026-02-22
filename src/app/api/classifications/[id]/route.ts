import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { emailClassifications } from "@/db/schema";
import { updateClassificationSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateClassificationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const updated = await db
    .update(emailClassifications)
    .set({ category: parsed.data.category, confidence: 1.0 })
    .where(
      and(
        eq(emailClassifications.id, id),
        eq(emailClassifications.userId, session.user.id)
      )
    )
    .returning({ id: emailClassifications.id, category: emailClassifications.category });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
