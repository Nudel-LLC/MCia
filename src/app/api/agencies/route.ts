import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { generateId } from "@/lib/ulid";

// GET /api/agencies - 所属事務所一覧
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM agencies WHERE user_id = ? ORDER BY created_at DESC")
    .bind(session.user.id)
    .all();

  return NextResponse.json(results);
}

// POST /api/agencies - 事務所登録
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name: string; email?: string; emailDomain: string };
  const { name, email, emailDomain } = body;

  if (!name || !emailDomain) {
    return NextResponse.json(
      { error: "name and emailDomain are required" },
      { status: 400 }
    );
  }

  const id = generateId();
  const now = new Date().toISOString();
  const db = getDB();

  await db
    .prepare(
      "INSERT INTO agencies (id, user_id, name, email, email_domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, session.user.id, name, email || null, emailDomain, now, now)
    .run();

  return NextResponse.json({ id, name, email, emailDomain }, { status: 201 });
}
