import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// GET /api/projects/:id/conflicts - 重複案件確認
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDB();

  // Get the target project
  const project = await db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
    .bind(id, session.user.id)
    .first<{ start_date: string; end_date: string }>();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find overlapping projects (date ranges overlap when start_a <= end_b AND end_a >= start_b)
  const { results } = await db
    .prepare(
      `SELECT p.*, a.name as agency_name
       FROM projects p
       LEFT JOIN agencies a ON p.agency_id = a.id
       WHERE p.user_id = ?
         AND p.id != ?
         AND p.status NOT IN ('declined', 'expired')
         AND p.start_date <= ?
         AND p.end_date >= ?
       ORDER BY p.start_date`
    )
    .bind(session.user.id, id, project.end_date, project.start_date)
    .all();

  return NextResponse.json(results);
}
