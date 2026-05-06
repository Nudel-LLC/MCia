import type { Database } from "./db";
import { eq } from "drizzle-orm";
import { users, notifications, NOTIFICATION_TYPES } from "@/db/schema";

const LINE_API_BASE = "https://api.line.me/v2/bot";

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface LineMessage {
  type: "text";
  text: string;
}

interface LineTemplateMessage {
  type: "template";
  altText: string;
  template: ConfirmTemplate;
}

interface ConfirmTemplate {
  type: "confirm";
  text: string;
  actions: Array<PostbackAction>;
}

interface PostbackAction {
  type: "postback";
  label: string;
  data: string;
  displayText?: string;
}

type LineMessageType = LineMessage | LineTemplateMessage;

export async function pushLineMessage(
  channelAccessToken: string,
  lineUserId: string,
  messages: LineMessageType[],
): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE push error (${response.status}): ${error}`);
  }
}

export async function issueLinkToken(
  channelAccessToken: string,
  lineUserId: string,
): Promise<string> {
  const response = await fetch(`${LINE_API_BASE}/user/${lineUserId}/linkToken`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`LINE linkToken error: ${response.status}`);
  }
  const data = (await response.json()) as { linkToken: string };
  return data.linkToken;
}

// ============================================================
// Notification helper — sends LINE + records in DB
// ============================================================

export interface NotifyContext {
  db: Database;
  lineChannelAccessToken: string;
}

export async function sendNotification(
  ctx: NotifyContext,
  userId: string,
  type: NotificationType,
  message: string,
  projectId?: string,
): Promise<void> {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { lineUserId: true },
  });

  const now = new Date().toISOString();
  let channel: "line" | "web" = "web";

  if (user?.lineUserId && ctx.lineChannelAccessToken) {
    try {
      await pushLineMessage(ctx.lineChannelAccessToken, user.lineUserId, [
        { type: "text", text: message },
      ]);
      channel = "line";
    } catch {
      channel = "web";
    }
  }

  await ctx.db.insert(notifications).values({
    userId,
    projectId: projectId ?? null,
    type,
    channel,
    message,
    sentAt: channel === "line" ? now : null,
    createdAt: now,
  });
}

export async function sendConfirmNotification(
  ctx: NotifyContext,
  userId: string,
  type: NotificationType,
  message: string,
  confirmData: { projectId: string; action: string },
): Promise<void> {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { lineUserId: true },
  });

  const now = new Date().toISOString();
  let channel: "line" | "web" = "web";

  if (user?.lineUserId && ctx.lineChannelAccessToken) {
    try {
      await pushLineMessage(ctx.lineChannelAccessToken, user.lineUserId, [
        {
          type: "template",
          altText: message,
          template: {
            type: "confirm",
            text: message,
            actions: [
              {
                type: "postback",
                label: "エントリーする",
                data: `action=${confirmData.action}&projectId=${confirmData.projectId}&approve=true`,
                displayText: "エントリーする",
              },
              {
                type: "postback",
                label: "スキップ",
                data: `action=${confirmData.action}&projectId=${confirmData.projectId}&approve=false`,
                displayText: "スキップ",
              },
            ],
          },
        },
      ]);
      channel = "line";
    } catch {
      channel = "web";
    }
  }

  await ctx.db.insert(notifications).values({
    userId,
    projectId: confirmData.projectId,
    type,
    channel,
    message,
    sentAt: channel === "line" ? now : null,
    createdAt: now,
  });
}

// ============================================================
// Message formatters
// ============================================================

export function formatEntryOkMessage(title: string, startDate: string, endDate: string): string {
  const start = formatDate(startDate);
  const end = startDate === endDate ? "" : `〜${formatDate(endDate)}`;
  return `${title}（${start}${end}）にエントリー下書きを作成しました。Gmailの下書きをご確認ください。`;
}

export function formatEntryNgMessage(
  title: string,
  startDate: string,
  endDate: string,
  conflictTitle: string,
): string {
  const start = formatDate(startDate);
  const end = startDate === endDate ? "" : `〜${formatDate(endDate)}`;
  return `${title}（${start}${end}）は確定済みの案件「${conflictTitle}」と重複しています。エントリーをスキップしました。`;
}

export function formatConfirmedMessage(
  title: string,
  declineTargets: Array<{ title: string; startDate: string; endDate: string }>,
): string {
  let msg = `${title}が決定しました。`;
  if (declineTargets.length > 0) {
    msg += "\n以下の案件の辞退下書きを作成しました:";
    for (const t of declineTargets) {
      const start = formatDate(t.startDate);
      const end = t.startDate === t.endDate ? "" : `〜${formatDate(t.endDate)}`;
      msg += `\n・${t.title}（${start}${end}）`;
    }
  }
  return msg;
}

export function formatDeclineSentMessage(title: string): string {
  return `${title}の辞退が完了し、カレンダーから削除しました。`;
}

export function formatEntrySentMessage(title: string, agencyName: string): string {
  return `${title}（${agencyName}）をカレンダーに登録しました。`;
}

export function formatUncertainMessage(subject: string, confidence: number): string {
  return `メールの分類に確信が持てません（確度: ${Math.round(confidence * 100)}%）。\n件名: ${subject}\nアプリで確認してください。`;
}

export function formatMcRelatedConfirmMessage(
  title: string,
  startDate: string,
  endDate: string,
  existingEventSummary: string,
): string {
  const start = formatDate(startDate);
  const end = startDate === endDate ? "" : `〜${formatDate(endDate)}`;
  return `${title}（${start}${end}）の日程に既存のMC予定「${existingEventSummary}」があります。エントリーしますか？`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
