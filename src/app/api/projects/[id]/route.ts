import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// GET /api/projects/:id - 案件詳細
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

  const project = await db
    .prepare(
      "SELECT p.*, a.name as agency_name FROM projects p LEFT JOIN agencies a ON p.agency_id = a.id WHERE p.id = ? AND p.user_id = ?"
    )
    .bind(id, session.user.id)
    .first();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
