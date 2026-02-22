import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { emailClassifications } from "@/db/schema";
import { paginationSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { limit, offset } = paginationSchema.parse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
  });

  const db = getDb();
  const results = await db
    .select()
    .from(emailClassifications)
    .where(eq(emailClassifications.userId, session.user.id))
    .orderBy(desc(emailClassifications.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}
