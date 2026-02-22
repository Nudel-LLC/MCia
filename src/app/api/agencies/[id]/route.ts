import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// PUT /api/agencies/:id - 事務所情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { name: string; email?: string; emailDomain: string };
  const { name, email, emailDomain } = body;
  const now = new Date().toISOString();
  const db = getDB();

  const result = await db
    .prepare(
      "UPDATE agencies SET name = ?, email = ?, email_domain = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    )
    .bind(name, email || null, emailDomain, now, id, session.user.id)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id, name, email, emailDomain });
}

// DELETE /api/agencies/:id - 事務所削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDB();

  const result = await db
    .prepare("DELETE FROM agencies WHERE id = ? AND user_id = ?")
    .bind(id, session.user.id)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
