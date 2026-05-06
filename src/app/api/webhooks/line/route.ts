import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb, getEnv } from "@/lib/db";
import { users, projects, accounts, agencies as agenciesTable } from "@/db/schema";
import { lineWebhookSchema } from "@/lib/validators";
import { pushLineMessage } from "@/lib/line-notify";
import {
  createGmailDraft,
  refreshAccessToken,
  createCalendarEvent,
} from "@/lib/google-api";
import { parseProjectEmail } from "@/lib/email-parser";
import { generatePR } from "@/lib/pr-generator";
import { buildEntryEmailBody } from "@/lib/email-processor";
import { emailTracking, prHistory } from "@/db/schema";
import { desc } from "drizzle-orm";

async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
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
    env.LINE_CHANNEL_SECRET,
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
      console.log("LINE follow event from:", event.source.userId);
    }

    if (event.type === "accountLink") {
      const lineUserId = event.source.userId;
      const linkEvent = event as unknown as {
        link?: { result: string; nonce: string };
      };
      if (linkEvent.link?.result === "ok" && linkEvent.link.nonce) {
        await db
          .update(users)
          .set({ lineUserId, updatedAt: new Date().toISOString() })
          .where(eq(users.id, linkEvent.link.nonce));

        await pushLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId, [
          { type: "text", text: "MCiaとLINEの連携が完了しました！案件の通知をこちらでお届けします。" },
        ]);
      }
    }

    if (event.type === "postback") {
      const postbackEvent = event as unknown as {
        source: { userId: string };
        postback: { data: string };
      };
      await handlePostback(
        postbackEvent.source.userId,
        postbackEvent.postback.data,
        env,
      );
    }
  }

  return NextResponse.json({ success: true });
}

async function handlePostback(
  lineUserId: string,
  data: string,
  env: CloudflareEnv,
): Promise<void> {
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const projectId = params.get("projectId");
  const approve = params.get("approve") === "true";

  if (!action || !projectId) return;

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.lineUserId, lineUserId),
  });
  if (!user) return;

  if (action === "entry_confirm") {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });
    if (!project || project.status !== "new") return;

    if (!approve) {
      await db
        .update(projects)
        .set({ status: "expired", updatedAt: new Date().toISOString() })
        .where(eq(projects.id, projectId));

      await pushLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId, [
        { type: "text", text: `${project.title}のエントリーをスキップしました。` },
      ]);
      return;
    }

    const account = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, user.id), eq(accounts.provider, "google")),
      columns: { access_token: true, refresh_token: true, expires_at: true },
    });
    if (!account?.refresh_token) return;

    let accessToken = account.access_token ?? "";
    if (!account.expires_at || Date.now() / 1000 > account.expires_at - 300) {
      const refreshed = await refreshAccessToken(
        env.AUTH_GOOGLE_ID,
        env.AUTH_GOOGLE_SECRET,
        account.refresh_token,
      );
      accessToken = refreshed.access_token;
      await db
        .update(accounts)
        .set({
          access_token: accessToken,
          expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
        })
        .where(and(eq(accounts.userId, user.id), eq(accounts.provider, "google")));
    }

    const agency = project.agencyId
      ? await db.query.agencies.findFirst({
          where: eq(agenciesTable.id, project.agencyId),
          columns: { name: true, email: true },
        })
      : null;

    let prText: string | null = null;
    if (project.requiresPr && project.genre) {
      const pastData = await db
        .select({
          title: projects.title,
          genre: projects.genre,
          startDate: projects.startDate,
          location: projects.location,
          wasSuccessful: prHistory.wasSuccessful,
        })
        .from(prHistory)
        .innerJoin(projects, eq(prHistory.projectId, projects.id))
        .where(and(eq(prHistory.userId, user.id), eq(projects.genre, project.genre)))
        .orderBy(desc(projects.startDate))
        .limit(5);

      prText = await generatePR(
        env.ANTHROPIC_API_KEY,
        { title: project.title, genre: project.genre, location: project.location },
        pastData.map((p) => ({
          title: p.title,
          genre: p.genre ?? "",
          startDate: p.startDate,
          location: p.location,
          wasSuccessful: !!p.wasSuccessful,
        })),
      );
    }

    const entryBody = buildEntryEmailBody(project.title, agency?.name || "", prText);
    const fromAddress = agency?.email || "";
    const now = new Date().toISOString();

    const draft = await createGmailDraft(
      accessToken,
      fromAddress,
      `エントリー希望 - ${project.title}`,
      entryBody,
      project.id,
    );

    await db
      .update(projects)
      .set({ status: "draft_created", draftEmailId: draft.id, updatedAt: now })
      .where(eq(projects.id, project.id));

    await db.insert(emailTracking).values({
      userId: user.id,
      projectId: project.id,
      gmailDraftId: draft.id,
      type: "entry",
      status: "draft",
      trackingTag: project.id,
      createdAt: now,
      updatedAt: now,
    });

    await pushLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId, [
      { type: "text", text: `${project.title}のエントリー下書きを作成しました。Gmailの下書きをご確認ください。` },
    ]);
  }
}
