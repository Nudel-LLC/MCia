import { NextRequest, NextResponse } from "next/server";
import { gmailWebhookSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const parsed = gmailWebhookSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const decoded = Buffer.from(parsed.data.message.data, "base64").toString("utf-8");
  const notification = JSON.parse(decoded) as { emailAddress?: string; historyId?: string };
  const { emailAddress, historyId } = notification;

  if (!emailAddress || !historyId) {
    return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  }

  // TODO: Queue the email processing job
  // const { env } = getCloudflareContext();
  // await env.EMAIL_QUEUE.send({ emailAddress, historyId });

  return NextResponse.json({ success: true });
}
