import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

const VALID_STATUSES = [
  "new",
  "draft_created",
  "entered",
  "confirmed",
  "decline_draft",
  "declined",
  "expired",
];

// PUT /api/projects/:id/status - ステータス手動更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const db = getDB();

  const result = await db
    .prepare(
      "UPDATE projects SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    )
    .bind(status, now, id, session.user.id)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id, status });
}
