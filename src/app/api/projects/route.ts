import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, agencies } from "@/db/schema";
import type { ProjectStatus } from "@/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ProjectStatus | null;
  const agencyId = searchParams.get("agency_id");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const db = getDb();
  const conditions = [eq(projects.userId, session.user.id)];
  if (status) conditions.push(eq(projects.status, status));
  if (agencyId) conditions.push(eq(projects.agencyId, agencyId));

  const results = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      agencyId: projects.agencyId,
      title: projects.title,
      startDate: projects.startDate,
      endDate: projects.endDate,
      location: projects.location,
      compensation: projects.compensation,
      genre: projects.genre,
      requiresPr: projects.requiresPr,
      status: projects.status,
      calendarEventId: projects.calendarEventId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      agencyName: agencies.name,
    })
    .from(projects)
    .leftJoin(agencies, eq(projects.agencyId, agencies.id))
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}
