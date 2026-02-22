import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// POST /api/webhooks/line - LINE Webhook
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // TODO: Verify LINE signature with LINE_CHANNEL_SECRET

  const body = await request.json();
  const events = body.events || [];
  const db = getDB();

  for (const event of events) {
    if (event.type === "follow") {
      // User added the LINE bot — link LINE user ID to MCia user
      // This requires the user to have previously initiated LINE linking from the app
      const lineUserId = event.source.userId;

      // TODO: Look up pending LINE link tokens and associate
      console.log("LINE follow event from:", lineUserId);
    }
  }

  return NextResponse.json({ success: true });
}
