/**
 * Email Processing Pipeline
 * Gmail Pub/Sub通知を受け取り、メール分類→案件解析→スケジュール確認→下書き作成を行う
 */

import { classifyEmail } from "./email-classifier";
import { parseProjectEmail } from "./email-parser";
import { generatePR } from "./pr-generator";
import {
  checkScheduleConflicts,
  findDeclineCandidates,
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
import { generateId } from "./ulid";

interface ProcessingContext {
  db: D1Database;
  apiKey: string; // Anthropic API key
  googleClientId: string;
  googleClientSecret: string;
}

interface UserRecord {
  id: string;
  email: string;
  gmail_history_id: string;
}

/**
 * Gmail通知を受けてメール処理を開始
 */
export async function processGmailNotification(
  ctx: ProcessingContext,
  emailAddress: string,
  historyId: string
) {
  // Find the user by email
  const user = await ctx.db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(emailAddress)
    .first<UserRecord>();

  if (!user) return;

  // Get the user's Google access token from Auth.js accounts table
  const account = await ctx.db
    .prepare(
      "SELECT access_token, refresh_token, expires_at FROM accounts WHERE \"userId\" = ? AND provider = 'google'"
    )
    .bind(user.id)
    .first<{
      access_token: string;
      refresh_token: string;
      expires_at: number;
    }>();

  if (!account?.refresh_token) return;

  // Refresh access token if needed
  let accessToken = account.access_token;
  if (!account.expires_at || Date.now() / 1000 > account.expires_at - 300) {
    const refreshed = await refreshAccessToken(
      ctx.googleClientId,
      ctx.googleClientSecret,
      account.refresh_token
    );
    accessToken = refreshed.access_token;

    // Update the stored token
    await ctx.db
      .prepare(
        'UPDATE accounts SET access_token = ?, expires_at = ? WHERE "userId" = ? AND provider = \'google\''
      )
      .bind(
        accessToken,
        Math.floor(Date.now() / 1000) + refreshed.expires_in,
        user.id
      )
      .run();
  }

  // Get email history since last check
  if (!user.gmail_history_id) return;

  const history = await getGmailHistory(accessToken, user.gmail_history_id);

  // Update history ID
  await ctx.db
    .prepare("UPDATE users SET gmail_history_id = ?, updated_at = ? WHERE id = ?")
    .bind(historyId, new Date().toISOString(), user.id)
    .run();

  if (!history.history) return;

  // Process new messages
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

/**
 * 受信メールを処理
 */
async function processIncomingEmail(
  ctx: ProcessingContext,
  user: UserRecord,
  accessToken: string,
  messageId: string
) {
  // Check if already processed
  const existing = await ctx.db
    .prepare(
      "SELECT id FROM email_classifications WHERE user_id = ? AND gmail_message_id = ?"
    )
    .bind(user.id, messageId)
    .first();

  if (existing) return;

  // Fetch the email
  const message = await getGmailMessage(accessToken, messageId);
  const headers = message.payload.headers;
  const from =
    headers.find((h: { name: string }) => h.name === "From")?.value || "";
  const subject =
    headers.find((h: { name: string }) => h.name === "Subject")?.value || "";

  // Step 1: Domain filter — check if from a registered agency
  const fromDomain = from.match(/@([^\s>]+)/)?.[1]?.toLowerCase();
  if (!fromDomain) return;

  const agency = await ctx.db
    .prepare(
      "SELECT * FROM agencies WHERE user_id = ? AND email_domain = ?"
    )
    .bind(user.id, fromDomain)
    .first<{ id: string; name: string }>();

  if (!agency) return; // Not from a registered agency

  // Decode email body
  const bodyData = extractEmailBody(message.payload);

  // Step 2: AI classification
  const classification = await classifyEmail(ctx.apiKey, subject, bodyData);

  // Save classification
  const classificationId = generateId();
  await ctx.db
    .prepare(
      "INSERT INTO email_classifications (id, user_id, gmail_message_id, from_address, subject, category, confidence, reason, processed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    )
    .bind(
      classificationId,
      user.id,
      messageId,
      from,
      subject,
      classification.category,
      classification.confidence,
      classification.reason
    )
    .run();

  // Process based on category
  if (classification.category === "recruitment") {
    await processRecruitmentEmail(
      ctx,
      user,
      accessToken,
      messageId,
      subject,
      bodyData,
      agency,
      classificationId
    );
  } else if (classification.category === "confirmation") {
    await processConfirmationEmail(
      ctx,
      user,
      accessToken,
      messageId,
      subject,
      bodyData,
      agency
    );
  }

  // Mark classification as processed
  await ctx.db
    .prepare("UPDATE email_classifications SET processed = 1 WHERE id = ?")
    .bind(classificationId)
    .run();
}

/**
 * 案件募集メールを処理（フロー1）
 */
async function processRecruitmentEmail(
  ctx: ProcessingContext,
  user: UserRecord,
  accessToken: string,
  messageId: string,
  subject: string,
  body: string,
  agency: { id: string; name: string },
  _classificationId: string
) {
  // Parse project details
  const parsed = await parseProjectEmail(ctx.apiKey, subject, body);

  // Create project record
  const projectId = generateId();
  const now = new Date().toISOString();

  await ctx.db
    .prepare(
      `INSERT INTO projects (id, user_id, agency_id, title, start_date, end_date, location, compensation, genre, requires_pr, status, source_email_id, raw_email_body, parsed_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)`
    )
    .bind(
      projectId,
      user.id,
      agency.id,
      parsed.title,
      parsed.startDate,
      parsed.endDate,
      parsed.location,
      parsed.compensation,
      parsed.genre,
      parsed.requiresPr ? 1 : 0,
      messageId,
      body,
      JSON.stringify(parsed),
      now,
      now
    )
    .run();

  // Check schedule conflicts
  const calendarData = await getCalendarEvents(
    accessToken,
    parsed.startDate,
    parsed.endDate
  );

  const calendarEvents: CalendarEvent[] = (calendarData.items || []).map(
    (item: Record<string, unknown>) => ({
      id: item.id,
      summary: item.summary || "",
      description: (item.description as string) || "",
      start:
        (item.start as Record<string, string>)?.date ||
        (item.start as Record<string, string>)?.dateTime ||
        "",
      end:
        (item.end as Record<string, string>)?.date ||
        (item.end as Record<string, string>)?.dateTime ||
        "",
      allDay: !!(item.start as Record<string, string>)?.date,
    })
  );

  // Get MCia managed event IDs
  const { results: mciaProjects } = await ctx.db
    .prepare(
      "SELECT id, status, calendar_event_id FROM projects WHERE user_id = ? AND calendar_event_id IS NOT NULL AND status NOT IN ('declined', 'expired')"
    )
    .bind(user.id)
    .all<{ id: string; status: string; calendar_event_id: string }>();

  const mciaEventIds = new Set(
    mciaProjects.map((p) => p.calendar_event_id)
  );
  const mciaProjectMap = new Map(
    mciaProjects.map((p) => [
      p.calendar_event_id,
      { id: p.id, status: p.status },
    ])
  );

  // Get agency names for heuristic detection
  const { results: agencies } = await ctx.db
    .prepare("SELECT name FROM agencies WHERE user_id = ?")
    .bind(user.id)
    .all<{ name: string }>();
  const agencyNames = agencies.map((a) => a.name);

  const conflict = checkScheduleConflicts(
    parsed.startDate,
    parsed.endDate,
    calendarEvents,
    mciaEventIds,
    mciaProjectMap,
    agencyNames
  );

  if (conflict.conflictType === "confirmed_block") {
    // Confirmed schedule conflict — skip entry
    await ctx.db
      .prepare("UPDATE projects SET status = 'expired', updated_at = ? WHERE id = ?")
      .bind(now, projectId)
      .run();
    // TODO: Send LINE notification (entry_ng)
    return;
  }

  // Create entry draft email
  const trackingTag = generateId();
  let prText: string | null = null;

  // Generate PR if required
  if (parsed.requiresPr) {
    const { results: pastProjects } = await ctx.db
      .prepare(
        "SELECT p.title, p.genre, p.start_date, p.location, ph.was_successful FROM pr_history ph JOIN projects p ON ph.project_id = p.id WHERE ph.user_id = ? AND p.genre = ? ORDER BY ph.was_successful DESC, p.start_date DESC LIMIT 5"
      )
      .bind(user.id, parsed.genre)
      .all<{
        title: string;
        genre: string;
        start_date: string;
        location: string;
        was_successful: number;
      }>();

    prText = await generatePR(
      ctx.apiKey,
      {
        title: parsed.title,
        genre: parsed.genre,
        location: parsed.location,
      },
      pastProjects.map((p) => ({
        title: p.title,
        genre: p.genre,
        startDate: p.start_date,
        location: p.location,
        wasSuccessful: p.was_successful === 1,
      }))
    );
  }

  // Build entry email body
  const entryBody = buildEntryEmailBody(parsed.title, agency.name, prText);

  // Create draft in Gmail
  const fromAddress = `info@${agency.name}`; // Will be the agency's reply-to address
  const draft = await createGmailDraft(
    accessToken,
    fromAddress,
    `エントリー希望 - ${parsed.title}`,
    entryBody,
    trackingTag
  );

  // Update project and create email tracking
  await ctx.db.batch([
    ctx.db
      .prepare(
        "UPDATE projects SET status = 'draft_created', draft_email_id = ?, updated_at = ? WHERE id = ?"
      )
      .bind(draft.id, now, projectId),
    ctx.db
      .prepare(
        "INSERT INTO email_tracking (id, user_id, project_id, gmail_draft_id, type, status, tracking_tag, created_at, updated_at) VALUES (?, ?, ?, ?, 'entry', 'draft', ?, ?, ?)"
      )
      .bind(generateId(), user.id, projectId, draft.id, trackingTag, now, now),
  ]);

  // TODO: Send LINE notification (entry_ok)
}

/**
 * 決定連絡メールを処理（フロー2）
 */
async function processConfirmationEmail(
  ctx: ProcessingContext,
  user: UserRecord,
  accessToken: string,
  _messageId: string,
  subject: string,
  body: string,
  _agency: { id: string; name: string }
) {
  const now = new Date().toISOString();

  // Try to match with an existing entered project
  // Use subject/body to find the best match
  const { results: enteredProjects } = await ctx.db
    .prepare(
      "SELECT * FROM projects WHERE user_id = ? AND status = 'entered' ORDER BY created_at DESC"
    )
    .bind(user.id)
    .all<{
      id: string;
      title: string;
      start_date: string;
      end_date: string;
      calendar_event_id: string;
      agency_id: string;
    }>();

  // Simple matching: check if project title appears in the email
  const matchedProject = enteredProjects.find(
    (p) => subject.includes(p.title) || body.includes(p.title)
  );

  if (!matchedProject) return;

  // Update project to confirmed
  if (matchedProject.calendar_event_id) {
    await updateCalendarEvent(accessToken, matchedProject.calendar_event_id, {
      summary: matchedProject.title.replace("【仮】", "【確定】"),
      colorId: "2", // green (sage)
    });
  }

  await ctx.db
    .prepare(
      "UPDATE projects SET status = 'confirmed', updated_at = ? WHERE id = ?"
    )
    .bind(now, matchedProject.id)
    .run();

  // Find overlapping tentative projects to decline
  const { results: tentativeProjects } = await ctx.db
    .prepare(
      `SELECT p.*, a.name as agency_name, a.email as agency_email
       FROM projects p
       LEFT JOIN agencies a ON p.agency_id = a.id
       WHERE p.user_id = ? AND p.status = 'entered' AND p.id != ?
         AND p.start_date <= ? AND p.end_date >= ?`
    )
    .bind(
      user.id,
      matchedProject.id,
      matchedProject.end_date,
      matchedProject.start_date
    )
    .all<{
      id: string;
      title: string;
      start_date: string;
      end_date: string;
      calendar_event_id: string;
      agency_email: string;
    }>();

  // Create decline drafts for each overlapping project
  for (const project of tentativeProjects) {
    const trackingTag = generateId();
    const declineBody = buildDeclineEmailBody(project.title);

    const draft = await createGmailDraft(
      accessToken,
      project.agency_email || "",
      `辞退のご連絡 - ${project.title}`,
      declineBody,
      trackingTag
    );

    await ctx.db.batch([
      ctx.db
        .prepare(
          "UPDATE projects SET status = 'decline_draft', draft_email_id = ?, updated_at = ? WHERE id = ?"
        )
        .bind(draft.id, now, project.id),
      ctx.db
        .prepare(
          "INSERT INTO email_tracking (id, user_id, project_id, gmail_draft_id, type, status, tracking_tag, created_at, updated_at) VALUES (?, ?, ?, ?, 'decline', 'draft', ?, ?, ?)"
        )
        .bind(
          generateId(),
          user.id,
          project.id,
          draft.id,
          trackingTag,
          now,
          now
        ),
    ]);
  }

  // TODO: Send LINE notification (confirmed + decline_draft list)
}

/**
 * 送信済みメールを処理（送信検知）
 */
async function processSentEmail(
  ctx: ProcessingContext,
  user: UserRecord,
  accessToken: string,
  messageId: string
) {
  const message = await getGmailMessage(accessToken, messageId);
  const bodyData = extractEmailBody(message.payload);

  // Look for MCia tracking tag
  const trackingMatch = bodyData.match(
    /<!-- mcia:tracking_id:([A-Z0-9]+) -->/
  );
  if (!trackingMatch) return;

  const trackingTag = trackingMatch[1];

  // Find the tracked email
  const tracking = await ctx.db
    .prepare(
      "SELECT * FROM email_tracking WHERE tracking_tag = ? AND user_id = ?"
    )
    .bind(trackingTag, user.id)
    .first<{
      id: string;
      project_id: string;
      type: string;
    }>();

  if (!tracking) return;

  const now = new Date().toISOString();

  // Update tracking status
  await ctx.db
    .prepare(
      "UPDATE email_tracking SET status = 'sent', gmail_message_id = ?, updated_at = ? WHERE id = ?"
    )
    .bind(messageId, now, tracking.id)
    .run();

  if (tracking.type === "entry") {
    // Entry email was sent → create calendar event
    const project = await ctx.db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .bind(tracking.project_id)
      .first<{
        id: string;
        title: string;
        start_date: string;
        end_date: string;
        agency_id: string;
      }>();

    if (!project) return;

    const agency = await ctx.db
      .prepare("SELECT name FROM agencies WHERE id = ?")
      .bind(project.agency_id)
      .first<{ name: string }>();

    const calendarEvent = await createCalendarEvent(
      accessToken,
      `【仮】${project.title} - ${agency?.name || ""}`,
      project.start_date,
      project.end_date,
      `MCia自動登録 | 案件ID: ${project.id}`,
      "5" // yellow (banana)
    );

    await ctx.db
      .prepare(
        "UPDATE projects SET status = 'entered', sent_email_id = ?, calendar_event_id = ?, updated_at = ? WHERE id = ?"
      )
      .bind(messageId, calendarEvent.id, now, project.id)
      .run();

    // TODO: Send LINE notification (entry sent + calendar registered)
  } else if (tracking.type === "decline") {
    // Decline email was sent → delete calendar event
    const project = await ctx.db
      .prepare("SELECT calendar_event_id FROM projects WHERE id = ?")
      .bind(tracking.project_id)
      .first<{ calendar_event_id: string }>();

    if (project?.calendar_event_id) {
      await deleteCalendarEvent(accessToken, project.calendar_event_id);
    }

    await ctx.db
      .prepare(
        "UPDATE projects SET status = 'declined', sent_email_id = ?, calendar_event_id = NULL, updated_at = ? WHERE id = ?"
      )
      .bind(messageId, now, tracking.project_id)
      .run();

    // TODO: Send LINE notification (decline sent + calendar deleted)
  }
}

// ========== Helper Functions ==========

function extractEmailBody(payload: Record<string, unknown>): string {
  // Try to get text/plain or text/html body
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
    // Recursively check nested parts
    if (part.parts) {
      const nested = extractEmailBody(part as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return "";
}

function buildEntryEmailBody(
  title: string,
  agencyName: string,
  prText: string | null
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

function buildDeclineEmailBody(title: string): string {
  return `お世話になっております。

下記案件について、誠に恐れ入りますが、別日程にて他決が出たため辞退させていただきたく存じます。
案件名: ${title}

またの機会がございましたら、ぜひよろしくお願いいたします。`;
}
