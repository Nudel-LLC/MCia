import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// GET /api/projects - 案件一覧
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const agencyId = searchParams.get("agency_id");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const db = getDB();
  let query = "SELECT p.*, a.name as agency_name FROM projects p LEFT JOIN agencies a ON p.agency_id = a.id WHERE p.user_id = ?";
  const bindings: unknown[] = [session.user.id];

  if (status) {
    query += " AND p.status = ?";
    bindings.push(status);
  }

  if (agencyId) {
    query += " AND p.agency_id = ?";
    bindings.push(agencyId);
  }

  query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const { results } = await db
    .prepare(query)
    .bind(...bindings)
    .all();

  return NextResponse.json(results);
}
