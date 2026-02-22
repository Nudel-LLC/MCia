import { NextRequest, NextResponse } from "next/server";

// POST /api/webhooks/gmail - Gmail Push Notification受信
export async function POST(request: NextRequest) {
  // Verify the request is from Google Pub/Sub
  const body = (await request.json()) as { message?: { data?: string; messageId?: string; publishTime?: string }; subscription?: string };

  // Pub/Sub sends messages in this format:
  // { message: { data: base64encoded, messageId, publishTime }, subscription }
  if (!body.message?.data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Decode the Pub/Sub message
  const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
  const notification = JSON.parse(decoded);

  // notification contains: { emailAddress, historyId }
  const { emailAddress, historyId } = notification;

  if (!emailAddress || !historyId) {
    return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  }

  // TODO: Queue the email processing job
  // const { env } = getCloudflareContext();
  // await env.EMAIL_QUEUE.send({ emailAddress, historyId });

  // Acknowledge immediately (Pub/Sub expects 2xx within 10s)
  return NextResponse.json({ success: true });
}
