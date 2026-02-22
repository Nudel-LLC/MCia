import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// PUT /api/classifications/:id - 分類結果の手動修正
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { category: string };
  const { category } = body;

  const validCategories = ["recruitment", "confirmation", "decline_ack", "other"];
  if (!category || !validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  const db = getDB();
  const result = await db
    .prepare(
      "UPDATE email_classifications SET category = ?, confidence = 1.0 WHERE id = ? AND user_id = ?"
    )
    .bind(category, id, session.user.id)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id, category });
}
