import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEnv } from "@/lib/db";
import { issueLinkToken } from "@/lib/line-notify";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { lineUserId?: string };
  if (!body.lineUserId) {
    return NextResponse.json({ error: "lineUserId required" }, { status: 400 });
  }

  const env = getEnv();
  const linkToken = await issueLinkToken(
    env.LINE_CHANNEL_ACCESS_TOKEN,
    body.lineUserId,
  );

  const linkUrl = `https://access.line.me/dialog/bot/accountLink?linkToken=${linkToken}&nonce=${session.user.id}`;

  return NextResponse.json({ linkUrl });
}
