import { NextRequest, NextResponse } from "next/server";
import { gmailWebhookSchema } from "@/lib/validators";
import { getDbAsync, getEnvAsync } from "@/lib/db";
import { processGmailNotification, type ProcessingContext } from "@/lib/email-processor";

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

  const [db, env] = await Promise.all([getDbAsync(), getEnvAsync()]);

  const ctx: ProcessingContext = {
    db,
    apiKey: env.ANTHROPIC_API_KEY,
    googleClientId: env.AUTH_GOOGLE_ID,
    googleClientSecret: env.AUTH_GOOGLE_SECRET,
  };

  await processGmailNotification(ctx, emailAddress, historyId);

  return NextResponse.json({ success: true });
}
