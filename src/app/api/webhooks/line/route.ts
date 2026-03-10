import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, getEnv } from "@/lib/db";
import { users } from "@/db/schema";
import { lineWebhookSchema } from "@/lib/validators";

async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const env = getEnv();
  const rawBody = await request.text();

  const valid = await verifyLineSignature(
    rawBody,
    signature,
    env.LINE_CHANNEL_SECRET
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = lineWebhookSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();

  for (const event of parsed.data.events) {
    if (event.type === "follow") {
      const lineUserId = event.source.userId;

      // accountLink イベントの linkToken を使ってユーザー紐付けを行う
      // follow イベントでは LINE userId のみ記録
      console.log("LINE follow event from:", lineUserId);
    }

    if (event.type === "accountLink") {
      const lineUserId = event.source.userId;
      // accountLink イベントから nonce (=userId) を取得してDB更新
      const linkEvent = event as unknown as {
        link?: { result: string; nonce: string };
      };
      if (linkEvent.link?.result === "ok" && linkEvent.link.nonce) {
        await db
          .update(users)
          .set({
            lineUserId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, linkEvent.link.nonce));
      }
    }
  }

  return NextResponse.json({ success: true });
}
