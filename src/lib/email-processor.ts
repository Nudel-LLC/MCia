/**
 * Email Processing Pipeline — Drizzle ORM 版
 *
 * Gmail Pub/Sub 通知を受け取り、以下のパイプラインを実行:
 *   メール分類 → 案件解析 → スケジュール確認 → 下書き作成
 */

import { eq, and, ne, lte, gte, isNotNull, notInArray, desc } from "drizzle-orm";
import type { Database } from "./db";
import {
  users,
  accounts,
  agencies as agenciesTable,
  projects,
  emailClassifications,
  emailTracking,
  prHistory,
} from "@/db/schema";
import type { User, Project } from "@/db/schema";
import { classifyEmail } from "./email-classifier";
import { parseProjectEmail } from "./email-parser";
import { generatePR } from "./pr-generator";
import {
  checkScheduleConflicts,
  type CalendarEvent,
} from "./schedule-checker";
import {
  getGmailHistory,
  getGmailMessage,
  createGmailDraft,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
} from "./google-api";

/** パイプラインに必要な外部コンテキスト */
export interface ProcessingContext {
  db: Database;
  apiKey: string;
  googleClientId: string;
  googleClientSecret: string;
}

// ============================================================
// Main entry point
// ============================================================

export async function processGmailNotification(
  ctx: ProcessingContext,
  emailAddress: string,
  historyId: string,
) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.email, emailAddress),
  });
  if (!user) return;

  const account = await ctx.db.query.accounts.findFirst({
    where: and(eq(accounts.userId, user.id), eq(accounts.provider, "google")),
    columns: { access_token: true, refresh_token: true, expires_at: true },
  });
  if (!account?.refresh_token) return;

  // Refresh access token if needed
  let accessToken = account.access_token ?? "";
  if (!account.expires_at || Date.now() / 1000 > account.expires_at - 300) {
    const refreshed = await refreshAccessToken(
      ctx.googleClientId,
      ctx.googleClientSecret,
      account.refresh_token,
    );
    accessToken = refreshed.access_token;

    await ctx.db
      .update(accounts)
      .set({
        access_token: accessToken,
        expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      })
      .where(and(eq(accounts.userId, user.id), eq(accounts.provider, "google")));
  }

  if (!user.gmailHistoryId) return;

  const history = await getGmailHistory(accessToken, user.gmailHistoryId);

  await ctx.db
    .update(users)
    .set({ gmailHistoryId: historyId, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id));

  if (!history.history) return;

  for (const record of history.history) {
    if (!record.messagesAdded) continue;
    for (const added of record.messagesAdded) {
      const messageId = added.message.id;
      const labelIds: string[] = added.message.labelIds || [];

      if (labelIds.includes("SENT")) {
        await processSentEmail(ctx, user, accessToken, messageId);
      } else if (labelIds.includes("INBOX")) {
        await processIncomingEmail(ctx, user, accessToken, messageId);
      }
    }
  }
}

// ============================================================
// 受信メール処理
// ============================================================

async function processIncomingEmail(
  ctx: ProcessingContext,
  user: User,
  accessToken: string,
  messageId: string,
) {
  const existing = await ctx.db.query.emailClassifications.findFirst({
    where: and(
      eq(emailClassifications.userId, user.id),
      eq(emailClassifications.gmailMessageId, messageId),
    ),
    columns: { id: true },
  });
  if (existing) return;

  const message = await getGmailMessage(accessToken, messageId);
  const headers = message.payload.headers;
  const from =
    headers.find((h: { name: string }) => h.name === "From")?.value || "";
  const subject =
    headers.find((h: { name: string }) => h.name === "Subject")?.value || "";

  const fromDomain = from.match(/@([^\s>]+)/)?.[1]?.toLowerCase();
  if (!fromDomain) return;

  const agency = await ctx.db.query.agencies.findFirst({
    where: and(
      eq(agenciesTable.userId, user.id),
      eq(agenciesTable.emailDomain, fromDomain),
    ),
    columns: { id: true, name: true },
  });
  if (!agency) return;

  const bodyData = extractEmailBody(message.payload);
  const classification = await classifyEmail(ctx.apiKey, subject, bodyData);

  const [saved] = await ctx.db
    .insert(emailClassifications)
    .values({
      userId: user.id,
      gmailMessageId: messageId,
      fromAddress: from,
      subject,
      category: classification.category,
      confidence: classification.confidence,
      reason: classification.reason,
      processed: false,
    })
    .returning({ id: emailClassifications.id });

  if (classification.category === "recruitment") {
    await processRecruitmentEmail(ctx, user, accessToken, messageId, subject, bodyData, agency);
  } else if (classification.category === "confirmation") {
    await processConfirmationEmail(ctx, user, accessToken, subject, bodyData);
  }

  await ctx.db
    .update(emailClassifications)
    .set({ processed: true })
    .where(eq(emailClassifications.id, saved.id));
}

// ============================================================
// 案件募集メール処理 (Flow 1)
// ============================================================

async function processRecruitmentEmail(
  ctx: ProcessingContext,
  user: User,
  accessToken: string,
  messageId: string,
  subject: string,
  body: string,
  agency: { id: string; name: string },
) {
  const parsed = await parseProjectEmail(ctx.apiKey, subject, body);
  const now = new Date().toISOString();

  const [project] = await ctx.db
    .insert(projects)
    .values({
      userId: user.id,
      agencyId: agency.id,
      title: parsed.title,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      location: parsed.location,
      compensation: parsed.compensation,
      genre: parsed.genre,
      requiresPr: parsed.requiresPr,
      status: "new",
      sourceEmailId: messageId,
      rawEmailBody: body,
      parsedData: JSON.stringify(parsed),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // ── スケジュール重複チェック ──
  const calendarData = await getCalendarEvents(accessToken, parsed.startDate, parsed.endDate);
  const calendarEvents: CalendarEvent[] = (calendarData.items || []).map(
    (item: Record<string, unknown>) => ({
      id: item.id,
      summary: item.summary || "",
      description: (item.description as string) || "",
      start:
        (item.start as Record<string, string>)?.date ||
        (item.start as Record<string, string>)?.dateTime || "",
      end:
        (item.end as Record<string, string>)?.date ||
        (item.end as Record<string, string>)?.dateTime || "",
      allDay: !!(item.start as Record<string, string>)?.date,
    }),
  );

  const mciaProjects = await ctx.db
    .select({ id: projects.id, status: projects.status, calendarEventId: projects.calendarEventId })
    .from(projects)
    .where(
      and(
        eq(projects.userId, user.id),
        isNotNull(projects.calendarEventId),
        notInArray(projects.status, ["declined", "expired"]),
      ),
    );

  const mciaEventIds = new Set(mciaProjects.map((p) => p.calendarEventId!));
  const mciaProjectMap = new Map(
    mciaProjects.map((p) => [p.calendarEventId!, { id: p.id, status: p.status }]),
  );

  const userAgencies = await ctx.db
    .select({ name: agenciesTable.name })
    .from(agenciesTable)
    .where(eq(agenciesTable.userId, user.id));
  const agencyNames = userAgencies.map((a) => a.name);

  const conflict = checkScheduleConflicts(
    parsed.startDate, parsed.endDate, calendarEvents, mciaEventIds, mciaProjectMap, agencyNames,
  );

  if (conflict.conflictType === "confirmed_block") {
    await ctx.db.update(projects).set({ status: "expired", updatedAt: now }).where(eq(projects.id, project.id));
    return;
  }

  // ── PR 生成 ──
  let prText: string | null = null;
  if (parsed.requiresPr) {
    const pastData = await ctx.db
      .select({
        title: projects.title,
        genre: projects.genre,
        startDate: projects.startDate,
        location: projects.location,
        wasSuccessful: prHistory.wasSuccessful,
      })
      .from(prHistory)
      .innerJoin(projects, eq(prHistory.projectId, projects.id))
      .where(and(eq(prHistory.userId, user.id), eq(projects.genre, parsed.genre ?? "")))
      .orderBy(desc(projects.startDate))
      .limit(5);

    prText = await generatePR(
      ctx.apiKey,
      { title: parsed.title, genre: parsed.genre, location: parsed.location },
      pastData.map((p) => ({
        title: p.title,
        genre: p.genre ?? "",
        startDate: p.startDate,
        location: p.location,
        wasSuccessful: !!p.wasSuccessful,
      })),
    );
  }

  // ── 下書き作成 ──
  const entryBody = buildEntryEmailBody(parsed.title, agency.name, prText);
  const fromAddress = `info@${agency.name}`;

  const draft = await createGmailDraft(
    accessToken, fromAddress, `エントリー希望 - ${parsed.title}`, entryBody, project.id,
  );

  await ctx.db.update(projects).set({ status: "draft_created", draftEmailId: draft.id, updatedAt: now }).where(eq(projects.id, project.id));
  await ctx.db.insert(emailTracking).values({
    userId: user.id,
    projectId: project.id,
    gmailDraftId: draft.id,
    type: "entry",
    status: "draft",
    trackingTag: project.id,
    createdAt: now,
    updatedAt: now,
  });
}

// ============================================================
// 決定連絡メール処理 (Flow 2)
// ============================================================

async function processConfirmationEmail(
  ctx: ProcessingContext,
  user: User,
  accessToken: string,
  subject: string,
  body: string,
) {
  const now = new Date().toISOString();

  const enteredProjects = await ctx.db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), eq(projects.status, "entered")))
    .orderBy(desc(projects.createdAt));

  const matched = enteredProjects.find(
    (p) => subject.includes(p.title) || body.includes(p.title),
  );
  if (!matched) return;

  if (matched.calendarEventId) {
    await updateCalendarEvent(accessToken, matched.calendarEventId, {
      summary: matched.title.replace("【仮】", "【確定】"),
      colorId: "2",
    });
  }

  await ctx.db.update(projects).set({ status: "confirmed", updatedAt: now }).where(eq(projects.id, matched.id));

  // 重複する仮案件に辞退下書きを作成
  const overlapping = await ctx.db
    .select({
      id: projects.id,
      title: projects.title,
      calendarEventId: projects.calendarEventId,
      agencyEmail: agenciesTable.email,
    })
    .from(projects)
    .leftJoin(agenciesTable, eq(projects.agencyId, agenciesTable.id))
    .where(
      and(
        eq(projects.userId, user.id),
        eq(projects.status, "entered"),
        ne(projects.id, matched.id),
        lte(projects.startDate, matched.endDate),
        gte(projects.endDate, matched.startDate),
      ),
    );

  for (const proj of overlapping) {
    const declineBody = buildDeclineEmailBody(proj.title);
    const draft = await createGmailDraft(
      accessToken, proj.agencyEmail || "", `辞退のご連絡 - ${proj.title}`, declineBody, proj.id,
    );

    await ctx.db.update(projects).set({ status: "decline_draft", draftEmailId: draft.id, updatedAt: now }).where(eq(projects.id, proj.id));
    await ctx.db.insert(emailTracking).values({
      userId: user.id,
      projectId: proj.id,
      gmailDraftId: draft.id,
      type: "decline",
      status: "draft",
      trackingTag: proj.id,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ============================================================
// 送信済みメール検知
// ============================================================

async function processSentEmail(
  ctx: ProcessingContext,
  user: User,
  accessToken: string,
  messageId: string,
) {
  const message = await getGmailMessage(accessToken, messageId);
  const bodyData = extractEmailBody(message.payload);

  const trackingMatch = bodyData.match(/<!-- mcia:tracking_id:([A-Za-z0-9_-]+) -->/);
  if (!trackingMatch) return;

  const tag = trackingMatch[1];
  const tracking = await ctx.db.query.emailTracking.findFirst({
    where: and(eq(emailTracking.trackingTag, tag), eq(emailTracking.userId, user.id)),
  });
  if (!tracking) return;

  const now = new Date().toISOString();

  await ctx.db
    .update(emailTracking)
    .set({ status: "sent", gmailMessageId: messageId, updatedAt: now })
    .where(eq(emailTracking.id, tracking.id));

  if (tracking.type === "entry") {
    const proj = await ctx.db.query.projects.findFirst({
      where: eq(projects.id, tracking.projectId),
    });
    if (!proj) return;

    const agency = await ctx.db.query.agencies.findFirst({
      where: eq(agenciesTable.id, proj.agencyId ?? ""),
      columns: { name: true },
    });

    const calendarEvent = await createCalendarEvent(
      accessToken,
      `【仮】${proj.title} - ${agency?.name || ""}`,
      proj.startDate,
      proj.endDate,
      `MCia自動登録 | 案件ID: ${proj.id}`,
      "5",
    );

    await ctx.db
      .update(projects)
      .set({ status: "entered", sentEmailId: messageId, calendarEventId: calendarEvent.id, updatedAt: now })
      .where(eq(projects.id, proj.id));
  } else if (tracking.type === "decline") {
    const proj = await ctx.db.query.projects.findFirst({
      where: eq(projects.id, tracking.projectId),
      columns: { calendarEventId: true },
    });

    if (proj?.calendarEventId) {
      await deleteCalendarEvent(accessToken, proj.calendarEventId);
    }

    await ctx.db
      .update(projects)
      .set({ status: "declined", sentEmailId: messageId, calendarEventId: null, updatedAt: now })
      .where(eq(projects.id, tracking.projectId));
  }
}

// ============================================================
// Helper Functions
// ============================================================

export function extractEmailBody(payload: Record<string, unknown>): string {
  const parts = (payload.parts as Array<Record<string, unknown>>) || [];

  if (parts.length === 0 && payload.body) {
    const bodyObj = payload.body as { data?: string };
    if (bodyObj.data) {
      return atob(bodyObj.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
  }

  for (const part of parts) {
    const mimeType = part.mimeType as string;
    if (mimeType === "text/plain" || mimeType === "text/html") {
      const body = part.body as { data?: string };
      if (body?.data) {
        return atob(body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    if (part.parts) {
      const nested = extractEmailBody(part as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return "";
}

export function buildEntryEmailBody(
  title: string,
  agencyName: string,
  prText: string | null,
): string {
  let body = `${agencyName} 御中

お世話になっております。

下記案件にエントリー希望です。
案件名: ${title}

ご検討のほど、よろしくお願いいたします。`;

  if (prText) {
    body += `

【自己PR】
---
${prText}
---`;
  }

  return body;
}

export function buildDeclineEmailBody(title: string): string {
  return `お世話になっております。

下記案件について、誠に恐れ入りますが、別日程にて他決が出たため辞退させていただきたく存じます。
案件名: ${title}

またの機会がございましたら、ぜひよろしくお願いいたします。`;
}
