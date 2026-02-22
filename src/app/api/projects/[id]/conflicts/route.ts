import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne, lte, gte, notInArray } from "drizzle-orm";
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

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
    columns: { startDate: true, endDate: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const results = await db
    .select({
      id: projects.id,
      title: projects.title,
      startDate: projects.startDate,
      endDate: projects.endDate,
      status: projects.status,
      agencyName: agencies.name,
    })
    .from(projects)
    .leftJoin(agencies, eq(projects.agencyId, agencies.id))
    .where(
      and(
        eq(projects.userId, session.user.id),
        ne(projects.id, id),
        notInArray(projects.status, ["declined", "expired"]),
        lte(projects.startDate, project.endDate),
        gte(projects.endDate, project.startDate)
      )
    )
    .orderBy(projects.startDate);

  return NextResponse.json(results);
}
