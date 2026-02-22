import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// GET /api/users/me - ユーザー情報取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const user = await db
    .prepare(
      "SELECT id, name, email, line_user_id, stripe_customer_id, subscription_status, gmail_history_id, created_at FROM users WHERE id = ?"
    )
    .bind(session.user.id)
    .first();

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT /api/users/me - ユーザー情報更新
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;
  const now = new Date().toISOString();
  const db = getDB();

  await db
    .prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?")
    .bind(name, now, session.user.id)
    .run();

  return NextResponse.json({ success: true });
}
