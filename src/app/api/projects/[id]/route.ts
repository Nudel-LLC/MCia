import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, agencies } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const [project] = await db
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
      sourceEmailId: projects.sourceEmailId,
      draftEmailId: projects.draftEmailId,
      sentEmailId: projects.sentEmailId,
      calendarEventId: projects.calendarEventId,
      rawEmailBody: projects.rawEmailBody,
      parsedData: projects.parsedData,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      agencyName: agencies.name,
    })
    .from(projects)
    .leftJoin(agencies, eq(projects.agencyId, agencies.id))
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)));

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
