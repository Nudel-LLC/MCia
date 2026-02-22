import { NextRequest, NextResponse } from "next/server";
import { lineWebhookSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // TODO: Verify LINE signature with LINE_CHANNEL_SECRET

  const parsed = lineWebhookSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const event of parsed.data.events) {
    if (event.type === "follow") {
      const lineUserId = event.source.userId;
      // TODO: Look up pending LINE link tokens and associate
      console.log("LINE follow event from:", lineUserId);
    }
  }

  return NextResponse.json({ success: true });
}
